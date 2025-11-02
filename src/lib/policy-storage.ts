// In-memory storage for policies
// In production, this should be replaced with a database (e.g., PostgreSQL, MongoDB, etc.)

import { randomUUID } from 'crypto';

export interface Policy {
  id: string;
  userAddress: string;
  airline: string;
  flightNumber: string;
  date: string;
  departureAirport?: string;
  ticketPrice: number;
  premium: number;
  originalPremium: number;
  discountAmount: number;
  promoCode?: string | null;
  codeDiscountType?: string | null;
  codeDiscountValue?: number | null;
  status: "active" | "claimed" | "expired";
  expirationDate: string;
  purchaseDate: string;
  transactionHash: string;
  flightStatus?: any;
  claimDate?: string;
  claimAmount?: number;
  claimStatus?: string;
}

// In-memory storage
const policiesStorage: Map<string, Policy> = new Map();

export function createPolicy(policyData: Omit<Policy, 'id'>): Policy {
  const id = randomUUID();
  const policy: Policy = {
    id,
    ...policyData,
  };
  policiesStorage.set(id, policy);
  return policy;
}

export function getPolicyById(policyId: string): Policy | undefined {
  return policiesStorage.get(policyId);
}

export function getPoliciesByUserAddress(userAddress: string): Policy[] {
  const normalizedAddress = userAddress.toLowerCase();
  return Array.from(policiesStorage.values()).filter(
    (policy) => policy.userAddress.toLowerCase() === normalizedAddress
  );
}

export function getAllPolicies(): Policy[] {
  return Array.from(policiesStorage.values());
}

export function updatePolicy(policyId: string, updates: Partial<Policy>): Policy | null {
  const policy = policiesStorage.get(policyId);
  if (!policy) {
    return null;
  }
  const updatedPolicy = { ...policy, ...updates };
  policiesStorage.set(policyId, updatedPolicy);
  return updatedPolicy;
}

// Store a contract policy with its onchain ID
export function storeContractPolicy(policy: Policy): void {
  policiesStorage.set(policy.id, policy);
}

// Initialize with some sample data for development/testing
export function initializeSampleData() {
  // Only initialize if storage is empty
  if (policiesStorage.size === 0) {
    const samplePolicies: Omit<Policy, 'id'>[] = [
      {
        userAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        airline: "Aeroméxico",
        flightNumber: "AM123",
        date: "2024-03-15",
        ticketPrice: 8500,
        premium: 425,
        originalPremium: 425,
        discountAmount: 0,
        status: "active",
        expirationDate: "2024-03-15",
        purchaseDate: "2024-02-10",
        transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
      },
      {
        userAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        airline: "Volaris",
        flightNumber: "Y4567",
        date: "2024-02-28",
        ticketPrice: 3200,
        premium: 160,
        originalPremium: 160,
        discountAmount: 0,
        status: "claimed",
        expirationDate: "2024-02-28",
        purchaseDate: "2024-01-15",
        transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000002",
        claimDate: "2024-02-25",
        claimAmount: 3200,
        claimStatus: "approved",
      },
      {
        userAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        airline: "Interjet",
        flightNumber: "IJ789",
        date: "2024-01-20",
        ticketPrice: 5200,
        premium: 260,
        originalPremium: 260,
        discountAmount: 0,
        status: "expired",
        expirationDate: "2024-01-20",
        purchaseDate: "2023-12-10",
        transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000003",
      },
    ];

    samplePolicies.forEach((policyData) => {
      createPolicy(policyData);
    });
  }
}

