//!
//! PalomitoInsurance - Parametric Flight Insurance on Arbitrum Stylus
//!
//! This contract provides flight insurance with premiums and payouts in USDC.
//! Policies are purchased by users and claims are verified by the owner/oracle.
//!
//! Note: this code is a template and has not been audited.
//!

// Allow `cargo stylus export-abi` to generate a main function.
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

#[macro_use]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::sol,
    prelude::*,
    stylus_core::log,
};

// -------- ERC20 Interface --------
sol_interface! {
    interface IERC20 {
        function transfer(address to, uint256 amount) external returns (bool);
        function transferFrom(address from, address to, uint256 amount) external returns (bool);
        function balanceOf(address account) external view returns (uint256);
        function decimals() external view returns (uint8);
    }
}

// -------- Events --------
sol! {
    event PolicyPurchased(
        address indexed user,
        uint256 policy_id,
        uint256 flight_id,
        uint256 coverage_amount,
        uint256 premium_paid,
        uint256 expiration
    );

    event PolicyStatusChanged(
        uint256 policy_id,
        bool active,
        bool claimed
    );

    event ClaimVerified(
        uint256 policy_id,
        bool triggered
    );

    event ClaimPaid(
        address indexed user,
        uint256 policy_id,
        uint256 payout
    );

    event PolicyExpired(
        uint256 policy_id
    );
}

// -------- Policy Struct --------
sol_storage! {
    pub struct Policy {
        uint256 id;
        address user;
        uint256 flight_id;
        uint256 ticket_price;      // USDC 6 decimals
        uint256 premium_paid;      // USDC 6 decimals
        uint256 coverage_amount;   // USDC 6 decimals
        uint256 expiration;        // unix timestamp
        bool active;
        bool claimed;
    }
}

// -------- Main Storage --------
sol_storage! {
    #[entrypoint]
    pub struct PalomitoInsurance {
        // Mapping: user address => vector of policies
        mapping(address => Policy[]) user_policies;

        // Mapping: policy ID => policy
        mapping(uint256 => Policy) all_policies;

        uint256 next_policy_id;
        address owner;
        address usdc_token;
        uint256 locked;  // Reentrancy guard
    }
}

// -------- Custom Errors --------
sol! {
    error NotOwner();
    error PolicyNotActive();
    error PolicyAlreadyClaimed();
    error PolicyNotFound();
    error IncorrectPremium();
    error InsufficientContractUSDC();
    error Reentrancy();
    error ExpirationInPast();
    error InvalidTicketPrice();
    error USDCTransferFailed();
    error PolicyNotExpired();
}

#[derive(SolidityError)]
pub enum PalomitoError {
    NotOwner(NotOwner),
    PolicyNotActive(PolicyNotActive),
    PolicyAlreadyClaimed(PolicyAlreadyClaimed),
    PolicyNotFound(PolicyNotFound),
    IncorrectPremium(IncorrectPremium),
    InsufficientContractUSDC(InsufficientContractUSDC),
    Reentrancy(Reentrancy),
    ExpirationInPast(ExpirationInPast),
    InvalidTicketPrice(InvalidTicketPrice),
    USDCTransferFailed(USDCTransferFailed),
    PolicyNotExpired(PolicyNotExpired),
}

// -------- Implementation --------
#[public]
impl PalomitoInsurance {
    // -------- Constructor (called once after deployment) --------
    pub fn init(&mut self, usdc_address: Address) {
        // Only initialize if owner is not set
        if self.owner.get() == Address::ZERO {
            self.owner.set(self.vm().msg_sender());
            self.usdc_token.set(usdc_address);
            self.locked.set(U256::from(1));
            self.next_policy_id.set(U256::ZERO);
        }
    }

    // -------- Core Functions --------

    /// Purchase a flight insurance policy
    pub fn buy_policy(
        &mut self,
        flight_id: U256,
        ticket_price: U256,
        expiration: U256,
    ) -> Result<(), PalomitoError> {
        // Reentrancy guard
        if self.locked.get() != U256::from(1) {
            return Err(PalomitoError::Reentrancy(Reentrancy {}));
        }
        self.locked.set(U256::from(2));

        // Validation
        let current_time = U256::from(self.vm().block_timestamp());
        if expiration <= current_time {
            self.locked.set(U256::from(1));
            return Err(PalomitoError::ExpirationInPast(ExpirationInPast {}));
        }
        if ticket_price == U256::ZERO {
            self.locked.set(U256::from(1));
            return Err(PalomitoError::InvalidTicketPrice(InvalidTicketPrice {}));
        }

        // Calculate premium (5% of ticket price)
        let required_premium = Self::quote_premium(ticket_price);

        // Get addresses before creating Call context
        let sender = self.vm().msg_sender();
        let contract_addr = self.vm().contract_address();
        let usdc_addr = self.usdc_token.get();

        // Transfer USDC from user to contract
        let usdc = IERC20::new(usdc_addr);
        let config = stylus_sdk::call::Call::new_in(self);
        let transfer_result = usdc
            .transfer_from(config, sender, contract_addr, required_premium);

        if transfer_result.is_err() {
            self.locked.set(U256::from(1));
            return Err(PalomitoError::IncorrectPremium(IncorrectPremium {}));
        }

        // Create new policy
        let policy_id = self.next_policy_id.get() + U256::from(1);
        self.next_policy_id.set(policy_id);

        // Store policy in all_policies mapping
        let mut policy = self.all_policies.setter(policy_id);
        policy.id.set(policy_id);
        policy.user.set(sender);
        policy.flight_id.set(flight_id);
        policy.ticket_price.set(ticket_price);
        policy.premium_paid.set(required_premium);
        policy.coverage_amount.set(ticket_price);
        policy.expiration.set(expiration);
        policy.active.set(true);
        policy.claimed.set(false);

        // Add policy to user's policy list
        let mut user_policy_list = self.user_policies.setter(sender);
        let mut new_policy = user_policy_list.grow();
        new_policy.id.set(policy_id);
        new_policy.user.set(sender);
        new_policy.flight_id.set(flight_id);
        new_policy.ticket_price.set(ticket_price);
        new_policy.premium_paid.set(required_premium);
        new_policy.coverage_amount.set(ticket_price);
        new_policy.expiration.set(expiration);
        new_policy.active.set(true);
        new_policy.claimed.set(false);

        // Emit events
        log(self.vm(), PolicyPurchased {
            user: sender,
            policy_id,
            flight_id,
            coverage_amount: ticket_price,
            premium_paid: required_premium,
            expiration,
        });
        log(self.vm(), PolicyStatusChanged {
            policy_id,
            active: true,
            claimed: false,
        });

        // Release lock
        self.locked.set(U256::from(1));
        Ok(())
    }

    /// Verify and pay a claim (owner only)
    pub fn verify_and_pay_claim(
        &mut self,
        policy_id: U256,
        cancellation_triggered: bool,
    ) -> Result<(), PalomitoError> {
        // Only owner
        if self.vm().msg_sender() != self.owner.get() {
            return Err(PalomitoError::NotOwner(NotOwner {}));
        }

        // Reentrancy guard
        if self.locked.get() != U256::from(1) {
            return Err(PalomitoError::Reentrancy(Reentrancy {}));
        }
        self.locked.set(U256::from(2));

        // Get policy
        let policy = self.all_policies.getter(policy_id);

        if policy.id.get() == U256::ZERO {
            self.locked.set(U256::from(1));
            return Err(PalomitoError::PolicyNotFound(PolicyNotFound {}));
        }
        if !policy.active.get() {
            self.locked.set(U256::from(1));
            return Err(PalomitoError::PolicyNotActive(PolicyNotActive {}));
        }
        if policy.claimed.get() {
            self.locked.set(U256::from(1));
            return Err(PalomitoError::PolicyAlreadyClaimed(PolicyAlreadyClaimed {}));
        }

        // Emit verification event
        log(self.vm(), ClaimVerified {
            policy_id,
            triggered: cancellation_triggered,
        });

        if cancellation_triggered {
            let coverage = policy.coverage_amount.get();
            let user = policy.user.get();
            let usdc_addr = self.usdc_token.get();
            let contract_addr = self.vm().contract_address();

            // Check contract has enough USDC and transfer in one call sequence
            let usdc = IERC20::new(usdc_addr);
            let config = stylus_sdk::call::Call::new_in(self);
            let balance = usdc.balance_of(config, contract_addr);

            if balance.is_err() || balance.unwrap() < coverage {
                self.locked.set(U256::from(1));
                return Err(PalomitoError::InsufficientContractUSDC(
                    InsufficientContractUSDC {},
                ));
            }

            // Update policy state
            let mut policy_mut = self.all_policies.setter(policy_id);
            policy_mut.claimed.set(true);
            policy_mut.active.set(false);

            // Transfer USDC to user
            let usdc2 = IERC20::new(usdc_addr);
            let config2 = stylus_sdk::call::Call::new_in(self);
            let transfer_result = usdc2.transfer(config2, user, coverage);
            if transfer_result.is_err() {
                self.locked.set(U256::from(1));
                return Err(PalomitoError::USDCTransferFailed(USDCTransferFailed {}));
            }

            // Emit events
            log(self.vm(), PolicyStatusChanged {
                policy_id,
                active: false,
                claimed: true,
            });
            log(self.vm(), ClaimPaid {
                user,
                policy_id,
                payout: coverage,
            });
        }

        // Release lock
        self.locked.set(U256::from(1));
        Ok(())
    }

    /// Expire a policy that has passed its expiration time
    pub fn expire_policy(&mut self, policy_id: U256) -> Result<(), PalomitoError> {
        let policy = self.all_policies.getter(policy_id);

        if policy.id.get() == U256::ZERO {
            return Err(PalomitoError::PolicyNotFound(PolicyNotFound {}));
        }

        let current_time = U256::from(self.vm().block_timestamp());
        if current_time <= policy.expiration.get() {
            return Err(PalomitoError::PolicyNotExpired(PolicyNotExpired {}));
        }

        if !policy.active.get() {
            return Ok(()); // Already expired/claimed
        }

        // Get claimed status before mutable borrow
        let claimed = policy.claimed.get();

        // Mark as inactive
        let mut policy_mut = self.all_policies.setter(policy_id);
        policy_mut.active.set(false);

        // Emit events
        log(self.vm(), PolicyExpired { policy_id });
        log(self.vm(), PolicyStatusChanged {
            policy_id,
            active: false,
            claimed,
        });

        Ok(())
    }

    // -------- View Functions --------

    /// Calculate premium for a given ticket price (5%)
    pub fn quote_premium(ticket_price: U256) -> U256 {
        (ticket_price * U256::from(5)) / U256::from(100)
    }

    /// Check if a policy exists
    pub fn policy_exists(&self, policy_id: U256) -> bool {
        self.all_policies.getter(policy_id).id.get() != U256::ZERO
    }

    /// Get policy status details
    pub fn get_policy_status(
        &self,
        policy_id: U256,
    ) -> (bool, bool, bool, bool, U256) {
        let policy = self.all_policies.getter(policy_id);
        let exists = policy.id.get() != U256::ZERO;
        let active = policy.active.get();
        let claimed = policy.claimed.get();
        let expiration = policy.expiration.get();
        let current_time = U256::from(self.vm().block_timestamp());
        let expired = exists && current_time > expiration;

        (exists, active, claimed, expired, expiration)
    }

    /// Get number of policies for a user
    pub fn get_user_policies_count(&self, user: Address) -> U256 {
        U256::from(self.user_policies.getter(user).len())
    }

    /// Get a specific policy by ID
    pub fn get_policy(&self, policy_id: U256) -> (U256, Address, U256, U256, U256, U256, U256, bool, bool) {
        let policy = self.all_policies.getter(policy_id);
        (
            policy.id.get(),
            policy.user.get(),
            policy.flight_id.get(),
            policy.ticket_price.get(),
            policy.premium_paid.get(),
            policy.coverage_amount.get(),
            policy.expiration.get(),
            policy.active.get(),
            policy.claimed.get(),
        )
    }

    /// Get user policy by index
    pub fn get_user_policy_by_index(
        &self,
        user: Address,
        index: U256,
    ) -> (U256, Address, U256, U256, U256, U256, U256, bool, bool) {
        let policies = self.user_policies.getter(user);
        let policy = policies.get(index).unwrap();

        (
            policy.id.get(),
            policy.user.get(),
            policy.flight_id.get(),
            policy.ticket_price.get(),
            policy.premium_paid.get(),
            policy.coverage_amount.get(),
            policy.expiration.get(),
            policy.active.get(),
            policy.claimed.get(),
        )
    }

    /// Get contract's USDC balance
    /// Note: This makes an external call to the USDC contract
    pub fn contract_usdc_balance(&mut self) -> U256 {
        let usdc_addr = self.usdc_token.get();
        let contract_addr = self.vm().contract_address();
        let usdc = IERC20::new(usdc_addr);
        let config = stylus_sdk::call::Call::new_in(self);
        match usdc.balance_of(config, contract_addr) {
            Ok(balance) => balance,
            Err(_) => U256::ZERO,
        }
    }

    /// Get the owner address
    pub fn get_owner(&self) -> Address {
        self.owner.get()
    }

    /// Get the USDC token address
    pub fn get_usdc_token(&self) -> Address {
        self.usdc_token.get()
    }

    /// Get next policy ID
    pub fn get_next_policy_id(&self) -> U256 {
        self.next_policy_id.get()
    }

    // -------- Admin Functions --------

    /// Transfer ownership to a new address
    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), PalomitoError> {
        if self.vm().msg_sender() != self.owner.get() {
            return Err(PalomitoError::NotOwner(NotOwner {}));
        }
        self.owner.set(new_owner);
        Ok(())
    }
}
