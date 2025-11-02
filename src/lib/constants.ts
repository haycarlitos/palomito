import { scroll, base, arbitrum } from "viem/chains";

// USDC Token Contract Addresses (Native USDC on each chain)
// NOTE: The contract's USDC() function takes precedence over these addresses
export const USDC_ADDRESSES = {
  // TODO: Update Scroll USDC address - currently using placeholder
  // Common Scroll USDC addresses:
  // - Bridged USDC: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
  // - Native Scroll USDC: Check with Scroll team or explorer
  [scroll.id]: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4" as `0x${string}`, // Scroll Mainnet - UPDATE IF INCORRECT
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, // Base Mainnet
  [arbitrum.id]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as `0x${string}`, // Arbitrum One Mainnet
} as const;

// Insurance Contract Address
export const INSURANCE_CONTRACT_ADDRESS = "0xC3498821e7b1eae0e47CBef225AC9D07E85E3E8B" as `0x${string}`;

// Contract ABI Export (re-exported for convenience)
export { abi as INSURANCE_CONTRACT_ABI } from "../../contracts/abi/abi";

// USDC Token ABI (ERC20 standard functions we need)
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "_spender", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
] as const;

