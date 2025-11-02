"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { showSuccessToast, showErrorToast } from "@/components/ui/custom-toast";
import { useLanguage } from "@/contexts/language-context";
import { getTranslations } from "@/lib/translations";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { useIdentity } from "@/hooks/use-identity";
import { INSURANCE_CONTRACT_ADDRESS, INSURANCE_CONTRACT_ABI } from "@/lib/constants";
import { scroll } from "viem/chains";
import { formatUnits } from "viem";
import { storeContractPolicy } from "@/lib/policy-storage";

interface Policy {
  id: string;
  airline: string;
  flightNumber: string;
  date: string;
  ticketPrice: number;
  premium: number;
  originalPremium: number;
  discountAmount: number;
  status: "active" | "claimed" | "expired";
  expirationDate: string;
  purchaseDate: string;
  transactionHash: string;
  userAddress: string;
  claimDate?: string;
  claimAmount?: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = getTranslations(language);
  const { authenticated, ready } = usePrivy();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { name: ensSubdomain, isLoading: isLoadingIdentity } = useIdentity(address);
  const [filter, setFilter] = useState<"all" | "active" | "claimed" | "expired">("all");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);

  // Fetch policy IDs from smart contract
  const { data: contractPolicyIds, isLoading: isLoadingContract } = useReadContract({
    address: INSURANCE_CONTRACT_ADDRESS,
    abi: INSURANCE_CONTRACT_ABI,
    functionName: "getUserPolicies",
    args: address ? [address] : undefined,
    chainId: scroll.id,
    query: {
      enabled: !!address && authenticated,
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch and merge policies from both smart contract and API
  useEffect(() => {
    const fetchAndMergePolicies = async () => {
      if (!address || !authenticated || !ready) {
        setIsLoadingPolicies(false);
        return;
      }

      try {
        setIsLoadingPolicies(true);

        // Fetch from API
        const apiResponse = await fetch(`/api/policies?userAddress=${address}`);
        let apiPolicies: Policy[] = [];
        if (apiResponse.ok) {
          const apiData = await apiResponse.json();
          apiPolicies = apiData.policies || [];
        }

        // Fetch full policy data for each policy ID
        let contractPoliciesFormatted: Policy[] = [];
        if (contractPolicyIds && Array.isArray(contractPolicyIds) && contractPolicyIds.length > 0 && publicClient) {
          // Fetch each policy's full data
          const policyPromises = contractPolicyIds.map(async (policyId: bigint) => {
            try {
              const policyData = await publicClient.readContract({
                address: INSURANCE_CONTRACT_ADDRESS,
                abi: INSURANCE_CONTRACT_ABI,
                functionName: "getPolicy",
                args: [policyId],
              });

              // Destructure the policy data (getPolicy returns a tuple)
              // Structure: [user, flightId, airline, flightNumber, flightDate, departureAirportIata, ticketPrice, premiumPaid, coverageAmount, expiration, active, claimed]
              const airline = policyData[2];
              const flightNumber = policyData[3];
              const ticketPrice = policyData[6];
              const premiumPaid = policyData[7];
              const expiration = policyData[9];
              const claimed = policyData[11];

              // Convert BigInt to number and format
              const ticketPriceNum = Number(formatUnits(ticketPrice || BigInt(0), 6)); // USDC has 6 decimals
              const premiumNum = Number(formatUnits(premiumPaid || BigInt(0), 6));
              const expirationTimestamp = Number(expiration || BigInt(0));
              const expirationDate = expirationTimestamp > 0 
                ? new Date(expirationTimestamp * 1000).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
              
              // Determine status
              let status: "active" | "claimed" | "expired" = "active";
              if (claimed) {
                status = "claimed";
              } else if (expirationTimestamp > 0 && expirationTimestamp < Date.now() / 1000) {
                status = "expired";
              }

              // Estimate purchase date: if expiration is in the future, estimate it's at least 1 day before
              // Otherwise, use a date before expiration (contract doesn't store purchase date)
              let purchaseDate: string;
              if (expirationTimestamp > 0) {
                const expirationDateObj = new Date(expirationTimestamp * 1000);
                const now = new Date();
                // If expiration is in the future, estimate purchase was at least 1 day before
                if (expirationDateObj > now) {
                  const estimatedPurchaseDate = new Date(expirationDateObj);
                  estimatedPurchaseDate.setDate(estimatedPurchaseDate.getDate() - 1);
                  purchaseDate = estimatedPurchaseDate.toISOString().split('T')[0];
                } else {
                  // If already expired, use a date before expiration
                  const estimatedPurchaseDate = new Date(expirationDateObj);
                  estimatedPurchaseDate.setDate(estimatedPurchaseDate.getDate() - 7); // 1 week before expiration
                  purchaseDate = estimatedPurchaseDate.toISOString().split('T')[0];
                }
              } else {
                // Fallback to today if no expiration date
                purchaseDate = new Date().toISOString().split('T')[0];
              }

              // Decode bytes32 to string for airline and flight number
              // bytes32 comes as hex string, need to decode it
              let airlineStr = "";
              let flightNumberStr = "";
              try {
                // Browser-compatible hex to string conversion
                const hexToString = (hex: string): string => {
                  if (!hex || typeof hex !== 'string') return '';
                  const hexStr = hex.startsWith('0x') ? hex.slice(2) : hex;
                  // Convert hex string to bytes
                  const bytes = new Uint8Array(hexStr.length / 2);
                  for (let i = 0; i < hexStr.length; i += 2) {
                    bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);
                  }
                  // Decode UTF-8 and remove null bytes
                  return new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '').trim();
                };

                if (airline) {
                  airlineStr = typeof airline === 'string' ? hexToString(airline) : '';
                }
                if (flightNumber) {
                  flightNumberStr = typeof flightNumber === 'string' ? hexToString(flightNumber) : '';
                }
              } catch (e) {
                console.warn("Error decoding airline/flightNumber:", e);
              }

              return {
                id: `onchain-${policyId.toString()}`,
                airline: airlineStr,
                flightNumber: flightNumberStr,
                date: expirationDate,
                ticketPrice: ticketPriceNum,
                premium: premiumNum,
                originalPremium: premiumNum,
                discountAmount: 0,
                status,
                expirationDate,
                purchaseDate,
                transactionHash: "",
                userAddress: address || "",
              } as Policy;
            } catch (error) {
              console.error(`Error fetching policy ${policyId}:`, error);
              return null;
            }
          });

          const policies = await Promise.all(policyPromises);
          contractPoliciesFormatted = policies.filter((p): p is Policy => p !== null);
          
          // Store contract policies in storage so they're available via API
          contractPoliciesFormatted.forEach(cp => {
            storeContractPolicy(cp);
          });
        }

        // Merge policies: prefer API data (has more details), but include contract data
        // Add contract policies that aren't in API
        const mergedPolicies = [...apiPolicies];
        contractPoliciesFormatted.forEach(cp => {
          // Check if we already have this policy from API
          const existsInApi = apiPolicies.some(ap => 
            (ap.transactionHash && cp.transactionHash && ap.transactionHash === cp.transactionHash) || 
            (ap.id && cp.id && ap.id.includes(cp.id))
          );
          if (!existsInApi) {
            mergedPolicies.push(cp);
          }
        });

        setPolicies(mergedPolicies);
      } catch (error) {
        console.error("Error fetching policies:", error);
        setPolicies([]);
      } finally {
        setIsLoadingPolicies(false);
      }
    };

    if (authenticated && ready && address) {
      fetchAndMergePolicies();
    }
  }, [address, authenticated, ready, contractPolicyIds, publicClient]);

  // Show loading state while checking authentication or if not ready
  if (!ready || (ready && !authenticated)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-stone-600">
            {language === "es" ? "Cargando..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  const handleClaim = async (policyId: string, ticketPrice: number) => {
    try {
      const response = await fetch(`/api/policy/${policyId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: ticketPrice,
          userAddress: address || "",
        }),
      });

      if (!response.ok) {
        throw new Error('Error processing claim');
      }

      const data = await response.json();
      showSuccessToast(data.message || t.dashboard.toast.claimSuccess);
      
      // Redirect to claims page after a short delay
      setTimeout(() => {
        router.push('/claims');
      }, 1500);
    } catch (error) {
      showErrorToast(t.dashboard.toast.claimError);
      console.error('Claim error:', error);
    }
  };
  // Get user profile from actual wallet and ENS data
  const userProfile = {
    ensSubdomain: ensSubdomain || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""),
    walletAddress: address || "",
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800 border-green-200",
      claimed: "bg-blue-100 text-blue-800 border-blue-200",
      expired: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels = {
      active: t.dashboard.status.active,
      claimed: t.dashboard.status.claimed,
      expired: t.dashboard.status.expired,
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100">
      <Header />

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Profile Section */}
          <section className="mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 ring-1 ring-amber-200/50 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 text-stone-800">{t.dashboard.profile}</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">
                    {t.dashboard.ensSubdomain}
                  </label>
                  <p className="text-lg font-semibold text-stone-800">
                    {isLoadingIdentity ? (
                      <span className="text-stone-400">Loading...</span>
                    ) : (
                      userProfile.ensSubdomain || (
                        <span className="text-stone-400 italic">No subdomain</span>
                      )
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">
                    {t.dashboard.walletAddress}
                  </label>
                  <p className="text-sm font-mono text-stone-700 break-all">
                    {userProfile.walletAddress || (
                      <span className="text-stone-400 italic">Not connected</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Policies Section */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-stone-800">{t.dashboard.policies}</h2>
              <Link href="/buy">
                <Button>{t.dashboard.newPolicy}</Button>
              </Link>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2">
              <button 
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "all"
                    ? "bg-amber-600 text-white"
                    : "bg-white border border-amber-200 text-stone-700 hover:bg-amber-50"
                }`}
              >
                {t.dashboard.filters.all}
              </button>
              <button 
                onClick={() => setFilter("active")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "active"
                    ? "bg-amber-600 text-white"
                    : "bg-white border border-amber-200 text-stone-700 hover:bg-amber-50"
                }`}
              >
                {t.dashboard.filters.active}
              </button>
              <button 
                onClick={() => setFilter("claimed")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "claimed"
                    ? "bg-amber-600 text-white"
                    : "bg-white border border-amber-200 text-stone-700 hover:bg-amber-50"
                }`}
              >
                {t.dashboard.filters.claimed}
              </button>
              <button 
                onClick={() => setFilter("expired")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === "expired"
                    ? "bg-amber-600 text-white"
                    : "bg-white border border-amber-200 text-stone-700 hover:bg-amber-50"
                }`}
              >
                {t.dashboard.filters.expired}
              </button>
            </div>

            {/* Policies List */}
            <div className="space-y-4">
              {(isLoadingPolicies || isLoadingContract) ? (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl ring-1 ring-amber-200/50">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
                  <p className="text-stone-600">{language === "es" ? "Cargando pólizas..." : "Loading policies..."}</p>
                </div>
              ) : policies.length === 0 ? (
                <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl ring-1 ring-amber-200/50">
                  <p className="text-stone-600 mb-4">{t.dashboard.noPolicies}</p>
                  <Link href="/buy">
                    <Button>{t.dashboard.buttons.buyFirst}</Button>
                  </Link>
                </div>
              ) : (
                policies
                  .filter((policy) => {
                    if (filter === "all") return true;
                    return policy.status === filter;
                  })
                  .map((policy) => (
                <div
                  key={policy.id}
                  className="bg-white/80 backdrop-blur-sm rounded-xl p-6 ring-1 ring-amber-200/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-stone-800">
                          {policy.airline} {policy.flightNumber}
                        </h3>
                        {getStatusBadge(policy.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-stone-600">{t.dashboard.fields.date}:</span>
                          <p className="font-medium text-stone-800">{policy.date}</p>
                        </div>
                        <div>
                          <span className="text-stone-600">{t.dashboard.fields.ticketPrice}:</span>
                          <p className="font-medium text-stone-800">${policy.ticketPrice.toLocaleString(language === 'es' ? 'es-MX' : 'en-US')}</p>
                        </div>
                        <div>
                          <span className="text-stone-600">{t.dashboard.fields.premium}:</span>
                          <p className="font-medium text-stone-800">${policy.premium.toLocaleString(language === 'es' ? 'es-MX' : 'en-US')}</p>
                        </div>
                        <div>
                          <span className="text-stone-600">{t.dashboard.fields.expires}:</span>
                          <p className="font-medium text-stone-800">{policy.expirationDate}</p>
                        </div>
                      </div>
                      {policy.status === "claimed" && (
                        <div className="mt-3 text-sm">
                          <span className="text-stone-600">{t.dashboard.fields.claimedOn} {policy.claimDate}: </span>
                          <span className="font-semibold text-green-600">
                            ${policy.claimAmount?.toLocaleString(language === 'es' ? 'es-MX' : 'en-US')}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/policy/${policy.id}`}>
                        <Button variant="outline" size="sm">
                          {t.dashboard.buttons.viewDetails}
                        </Button>
                      </Link>
                      {policy.status === "active" && (
                        <Button size="sm" onClick={() => handleClaim(policy.id, policy.ticketPrice)}>
                          {t.dashboard.buttons.claim}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

