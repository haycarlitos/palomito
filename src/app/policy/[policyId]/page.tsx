"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ProfileButton } from "@/components/ui/profile-button";
import { Button } from "@/components/ui/button";
import { showSuccessToast, showErrorToast } from "@/components/ui/custom-toast";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract } from "wagmi";
import { useIdentity } from "@/hooks/use-identity";
import { useLanguage } from "@/contexts/language-context";
import { getTranslations } from "@/lib/translations";
import { INSURANCE_CONTRACT_ADDRESS, INSURANCE_CONTRACT_ABI } from "@/lib/constants";
import { formatUnits } from "viem";

interface PolicyData {
  id: string;
  airline: string;
  flightNumber: string;
  date: string;
  departureTime?: string;
  arrivalTime?: string;
  origin?: string;
  destination?: string;
  departureAirport?: string;
  ticketPrice: number;
  premium: number;
  originalPremium?: number;
  discountAmount?: number;
  promoCode?: string | null;
  codeDiscountType?: string | null;
  codeDiscountValue?: number | null;
  coverage?: number;
  status: "active" | "claimed" | "expired";
  expirationDate: string;
  purchaseDate: string;
  claimDate?: string;
  claimAmount?: number;
  claimStatus?: string;
  flightStatus?: string;
  transactionHash?: string;
}

export default function PolicyDetails() {
  const router = useRouter();
  const params = useParams();
  const policyId = params.policyId as string;
  const { authenticated, ready } = usePrivy();
  const { address } = useAccount();
  const { name: ensSubdomain, isLoading: isLoadingIdentity } = useIdentity(address);
  const { language } = useLanguage();
  
  // State for policy data
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if this is an onchain policy
  const isOnchainPolicy = policyId?.startsWith('onchain-');
  const onchainPolicyIdStr = isOnchainPolicy ? policyId.replace('onchain-', '') : null;
  // Safely convert to BigInt, only if it's a valid number
  const onchainPolicyId = onchainPolicyIdStr && !isNaN(Number(onchainPolicyIdStr)) 
    ? BigInt(onchainPolicyIdStr) 
    : null;

  // Fetch onchain policy data if needed
  const { data: onchainPolicyData } = useReadContract({
    address: INSURANCE_CONTRACT_ADDRESS,
    abi: INSURANCE_CONTRACT_ABI,
    functionName: "getPolicy",
    args: onchainPolicyId ? [onchainPolicyId] : undefined,
    query: {
      enabled: !!isOnchainPolicy && !!onchainPolicyId && ready && authenticated,
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch policy data from API or contract
  useEffect(() => {
    const fetchPolicy = async () => {
      if (!policyId) {
        setIsLoading(false);
        setError("Policy ID not provided");
        return;
      }

      // If it's an onchain policy, we'll handle it in the next useEffect
      if (isOnchainPolicy) {
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/policy/${policyId}`);
        if (response.ok) {
          const data = await response.json();
          setPolicy(data.policy);
        } else if (response.status === 404) {
          setError("Policy not found");
        } else {
          setError("Error loading policy");
        }
      } catch (error) {
        console.error("Error fetching policy:", error);
        setError("Error loading policy");
      } finally {
        setIsLoading(false);
      }
    };

    if (ready && authenticated && policyId && !isOnchainPolicy) {
      fetchPolicy();
    }
  }, [policyId, ready, authenticated, isOnchainPolicy]);

  // Handle onchain policy data
  useEffect(() => {
    if (!isOnchainPolicy || !onchainPolicyData || !address) {
      if (isOnchainPolicy) {
        setIsLoading(true);
      }
      return;
    }

    const processOnchainPolicy = async () => {
      try {
        setIsLoading(true);
        
        // getPolicy returns a tuple: [user, flightId, airline, flightNumber, flightDate, departureAirportIata, ticketPrice, premiumPaid, coverageAmount, expiration, active, claimed]
        const policyDataTuple = onchainPolicyData as unknown as any[];
        
        // Extract data from tuple
        const airline = policyDataTuple[2];
        const flightNumber = policyDataTuple[3];
        const flightDate = policyDataTuple[4];
        const departureAirportIata = policyDataTuple[5];
        const ticketPrice = policyDataTuple[6];
        const premiumPaid = policyDataTuple[7];
        const coverageAmount = policyDataTuple[8];
        const expiration = policyDataTuple[9];
        const claimed = policyDataTuple[11];

        // Convert BigInt to numbers
        const ticketPriceNum = Number(formatUnits(ticketPrice || BigInt(0), 6)); // USDC has 6 decimals
        const premiumNum = Number(formatUnits(premiumPaid || BigInt(0), 6));
        const coverageNum = Number(formatUnits(coverageAmount || BigInt(0), 6));
        const expirationTimestamp = Number(expiration || BigInt(0));
        const flightDateTimestamp = Number(flightDate || BigInt(0));
        
        const expirationDate = expirationTimestamp > 0 
          ? new Date(expirationTimestamp * 1000).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        const flightDateStr = flightDateTimestamp > 0
          ? new Date(flightDateTimestamp * 1000).toISOString().split('T')[0]
          : expirationDate;
        
        // Determine status
        let status: "active" | "claimed" | "expired" = "active";
        if (claimed) {
          status = "claimed";
        } else if (expirationTimestamp > 0 && expirationTimestamp < Date.now() / 1000) {
          status = "expired";
        }

        // Estimate purchase date: if expiration is in the future, estimate it's at least 1 day before
        let purchaseDate: string;
        if (expirationTimestamp > 0) {
          const expirationDateObj = new Date(expirationTimestamp * 1000);
          const now = new Date();
          if (expirationDateObj > now) {
            const estimatedPurchaseDate = new Date(expirationDateObj);
            estimatedPurchaseDate.setDate(estimatedPurchaseDate.getDate() - 1);
            purchaseDate = estimatedPurchaseDate.toISOString().split('T')[0];
          } else {
            const estimatedPurchaseDate = new Date(expirationDateObj);
            estimatedPurchaseDate.setDate(estimatedPurchaseDate.getDate() - 7);
            purchaseDate = estimatedPurchaseDate.toISOString().split('T')[0];
          }
        } else {
          purchaseDate = new Date().toISOString().split('T')[0];
        }

        // Decode bytes32 to string for airline and flight number
        const hexToString = (hex: string): string => {
          if (!hex || typeof hex !== 'string') return '';
          const hexStr = hex.startsWith('0x') ? hex.slice(2) : hex;
          const bytes = new Uint8Array(hexStr.length / 2);
          for (let i = 0; i < hexStr.length; i += 2) {
            bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);
          }
          return new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '').trim();
        };

        // Decode bytes3 to string for departure airport
        const bytes3ToString = (hex: string): string => {
          if (!hex || typeof hex !== 'string') return '';
          const hexStr = hex.startsWith('0x') ? hex.slice(2) : hex;
          const bytes = new Uint8Array(hexStr.length / 2);
          for (let i = 0; i < hexStr.length; i += 2) {
            bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);
          }
          return new TextDecoder('utf-8').decode(bytes).replace(/\0/g, '').trim();
        };

        let airlineStr = "";
        let flightNumberStr = "";
        let departureAirportStr = "";
        
        try {
          if (airline) {
            airlineStr = typeof airline === 'string' ? hexToString(airline) : '';
          }
          if (flightNumber) {
            flightNumberStr = typeof flightNumber === 'string' ? hexToString(flightNumber) : '';
          }
          if (departureAirportIata) {
            departureAirportStr = typeof departureAirportIata === 'string' ? bytes3ToString(departureAirportIata) : '';
          }
        } catch (e) {
          console.warn("Error decoding contract data:", e);
        }

        // Build initial policy data
        let policyData: PolicyData = {
          id: policyId,
          airline: airlineStr,
          flightNumber: flightNumberStr,
          date: flightDateStr,
          departureAirport: departureAirportStr,
          ticketPrice: ticketPriceNum,
          premium: premiumNum,
          originalPremium: premiumNum,
          discountAmount: 0,
          coverage: coverageNum,
          status,
          expirationDate,
          purchaseDate,
          transactionHash: "",
        };

        // If we have airline and flight number, fetch flight details
        if (airlineStr && flightNumberStr && flightDateStr) {
          try {
            console.log("Fetching flight status for:", { airlineStr, flightNumberStr, flightDateStr, departureAirportStr });
            const flightStatusResponse = await fetch(
              `/api/flight-status?airline=${encodeURIComponent(airlineStr)}&flightNumber=${encodeURIComponent(flightNumberStr)}&date=${flightDateStr}${departureAirportStr ? `&departureAirport=${encodeURIComponent(departureAirportStr)}` : ''}`
            );
            
            if (flightStatusResponse.ok) {
              const flightStatusData = await flightStatusResponse.json();
              console.log("Flight status response:", flightStatusData);
              console.log("Response structure check:", {
                exists: flightStatusData.exists,
                hasFlightStatus: !!flightStatusData.flightStatus,
                flightStatusKeys: flightStatusData.flightStatus ? Object.keys(flightStatusData.flightStatus) : []
              });
              
              if (flightStatusData.exists && flightStatusData.flightStatus) {
                const flight = flightStatusData.flightStatus;
                
                // Extract airport codes and names
                const originCode = flight.departure?.airportIata;
                const destinationCode = flight.arrival?.airportIata;
                const originName = flight.departure?.airport;
                const destinationName = flight.arrival?.airport;
                
                console.log("Extracted flight data:", {
                  originCode,
                  destinationCode,
                  originName,
                  destinationName,
                  departureUtc: flight.departure?.scheduledTimeUtc,
                  arrivalUtc: flight.arrival?.scheduledTimeUtc,
                });
                
                // Format time from UTC string if scheduledTimeLocal is null
                const formatTimeFromUtc = (utcString: string | null | undefined): string | null => {
                  if (!utcString) return null;
                  try {
                    // Format: "2025-11-03 06:59Z" -> "06:59"
                    // Also handle: "2025-11-03T06:59:00Z" or "2025-11-03T06:59Z"
                    const timeMatch = utcString.match(/(\d{2}):(\d{2})/);
                    if (timeMatch) {
                      return `${timeMatch[1]}:${timeMatch[2]}`;
                    }
                  } catch (e) {
                    console.warn("Error parsing UTC time:", e);
                  }
                  return null;
                };
                
                // Get departure time - prefer scheduledTimeLocal, fallback to UTC
                let depTime: string | null = null;
                if (flight.departure?.scheduledTimeLocal) {
                  depTime = flight.departure.scheduledTimeLocal.trim();
                } else if (flight.departure?.scheduledTimeUtc) {
                  depTime = formatTimeFromUtc(flight.departure.scheduledTimeUtc);
                  console.log("Formatted departure time from UTC:", flight.departure.scheduledTimeUtc, "->", depTime);
                }
                
                // Get arrival time - prefer scheduledTimeLocal, fallback to UTC
                let arrTime: string | null = null;
                if (flight.arrival?.scheduledTimeLocal) {
                  arrTime = flight.arrival.scheduledTimeLocal.trim();
                } else if (flight.arrival?.scheduledTimeUtc) {
                  arrTime = formatTimeFromUtc(flight.arrival.scheduledTimeUtc);
                  console.log("Formatted arrival time from UTC:", flight.arrival.scheduledTimeUtc, "->", arrTime);
                }
                
                // Build updated policy data - use airportIata codes directly
                const finalOrigin = originCode || originName || policyData.origin || policyData.departureAirport || '';
                const finalDestination = destinationCode || destinationName || '';
                
                // Convert times to strings, or undefined if null
                const finalDepTime = depTime || undefined;
                const finalArrTime = arrTime || undefined;
                
                console.log("Before update:", {
                  currentOrigin: policyData.origin,
                  currentDestination: policyData.destination,
                  finalOrigin,
                  finalDestination,
                  finalDepTime,
                  finalArrTime
                });
                
                policyData = {
                  ...policyData,
                  origin: finalOrigin,
                  destination: finalDestination,
                  departureTime: finalDepTime,
                  arrivalTime: finalArrTime,
                  flightStatus: flight.status || flightStatusData.status || policyData.flightStatus || undefined,
                };
                
                console.log("Enhanced policy data:", {
                  origin: policyData.origin,
                  destination: policyData.destination,
                  departureTime: policyData.departureTime,
                  arrivalTime: policyData.arrivalTime,
                  extracted: {
                    originCode,
                    destinationCode,
                    depTime,
                    arrTime,
                  },
                  flight: {
                    departure: flight.departure,
                    arrival: flight.arrival,
                  }
                });
              } else {
                console.warn("Flight status data structure issue:", {
                  exists: flightStatusData.exists,
                  hasFlightStatus: !!flightStatusData.flightStatus
                });
              }
            } else {
              console.warn("Flight status API returned non-OK status:", flightStatusResponse.status);
            }
          } catch (e) {
            console.warn("Error fetching flight status:", e);
            // Continue with basic policy data even if flight status fails
          }
        } else {
          console.warn("Missing flight info for API call:", { airlineStr, flightNumberStr, flightDateStr });
        }

        console.log("Final policyData before setState:", policyData);
        setPolicy(policyData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error processing onchain policy:", error);
        setError("Error loading policy from contract");
        setIsLoading(false);
      }
    };

    processOnchainPolicy();
  }, [isOnchainPolicy, onchainPolicyData, address, policyId]);

  // Show loading state while checking authentication or if not ready
  if (!ready || (ready && !authenticated)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-stone-600">{language === "es" ? "Cargando..." : "Loading..."}</p>
        </div>
      </div>
    );
  }

  // Show loading while fetching policy
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-stone-600">{language === "es" ? "Cargando póliza..." : "Loading policy..."}</p>
        </div>
      </div>
    );
  }

  // Show error if policy not found
  if (error || !policy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-stone-800">
            {language === "es" ? "Póliza no encontrada" : "Policy not found"}
          </h1>
          <p className="text-stone-600 mb-6">{error || (language === "es" ? "La póliza solicitada no existe." : "The requested policy does not exist.")}</p>
          <Link href="/dashboard">
            <Button>{language === "es" ? "Volver al Panel" : "Back to Dashboard"}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calculate coverage (defaults to ticketPrice if not provided)
  const coverage = policy.coverage || policy.ticketPrice;
  
  // Extract origin/destination from departureAirport if needed
  const origin = policy.origin || policy.departureAirport || "";
  const destination = policy.destination || "";
  
  // Default flight status
  const flightStatus = policy.flightStatus || "on_time";

  const handleClaim = async () => {
    try {
      const response = await fetch(`/api/policy/${policyId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          amount: coverage,
          userAddress: address || "",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al procesar el reclamo');
      }

      const data = await response.json();
      showSuccessToast(data.message || 'Reclamo enviado exitosamente');
      
      // Redirect to claims page after a short delay
      setTimeout(() => {
        router.push('/claims');
      }, 1500);
    } catch (error) {
      showErrorToast('Error al enviar el reclamo. Por favor intenta de nuevo.');
      console.error('Claim error:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-800 border-green-200",
      claimed: "bg-blue-100 text-blue-800 border-blue-200",
      expired: "bg-gray-100 text-gray-800 border-gray-200",
    };
    const labels = {
      active: "Activa",
      claimed: "Reclamada",
      expired: "Expirada",
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getFlightStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      on_time: "bg-green-100 text-green-800 border-green-200",
      delayed: "bg-yellow-100 text-yellow-800 border-yellow-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
      completed: "bg-blue-100 text-blue-800 border-blue-200",
    };
    const labels: Record<string, string> = {
      on_time: "A tiempo",
      delayed: "Retrasado",
      cancelled: "Cancelado",
      completed: "Completado",
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${styles[status] || styles.completed}`}>
        {labels[status] || labels.completed}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100">
      {/* Header */}
      <header className="w-full border-b border-amber-200/50 bg-amber-50/80 backdrop-blur supports-[backdrop-filter]:bg-amber-50/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image src="/palomito-logo.png" alt="Palomito" width={96} height={96} />
            </Link>
          </div>
          <ProfileButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/dashboard" className="text-amber-700 hover:text-amber-900 transition-colors">
              ← Volver al Panel
            </Link>
          </div>

          {/* Policy Header */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-stone-800">
                  {policy.airline} {policy.flightNumber}
                </h1>
                <p className="text-stone-600">Póliza #{policy.id}</p>
              </div>
              <div className="flex gap-3">
                {getStatusBadge(policy.status)}
                {getFlightStatusBadge(flightStatus)}
              </div>
            </div>

            {/* Claim Banner */}
            {policy.status === "active" && flightStatus === "cancelled" && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-yellow-800 mb-2">
                  Tu vuelo fue cancelado: ¡Puedes reclamar ahora!
                </p>
                <Button onClick={handleClaim}>Reclamar Cobertura</Button>
              </div>
            )}
          </div>

          {/* Flight Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm mb-6">
            <h2 className="text-2xl font-bold mb-6 text-stone-800">Información del Vuelo</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Origen</label>
                <p className="text-lg font-semibold text-stone-800">{origin || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Destino</label>
                <p className="text-lg font-semibold text-stone-800">{destination || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Fecha</label>
                <p className="text-lg font-semibold text-stone-800">{policy.date}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Hora de Salida</label>
                <p className="text-lg font-semibold text-stone-800">{policy.departureTime || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Hora de Llegada</label>
                <p className="text-lg font-semibold text-stone-800">{policy.arrivalTime || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Aerolínea</label>
                <p className="text-lg font-semibold text-stone-800">{policy.airline}</p>
              </div>
            </div>
          </div>

          {/* Coverage Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm mb-6">
            <h2 className="text-2xl font-bold mb-6 text-stone-800">Detalles de Cobertura</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Precio del Boleto</label>
                <p className="text-2xl font-bold text-stone-800">
                  ${policy.ticketPrice.toLocaleString('es-MX')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Prima Pagada</label>
                <p className="text-2xl font-bold text-amber-700">
                  ${policy.premium.toLocaleString('es-MX')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Cobertura Total</label>
                <p className="text-2xl font-bold text-green-600">
                  ${coverage.toLocaleString('es-MX')}
                </p>
              </div>
            </div>
            
            {/* Promo Code Information */}
            {policy.promoCode && (
              <div className="mt-6 pt-6 border-t border-amber-200">
                <h3 className="text-lg font-semibold mb-4 text-stone-800">Información del Código Promocional</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-stone-600 mb-1">Código utilizado:</p>
                      <p className="text-lg font-bold text-green-700">{policy.promoCode}</p>
                    </div>
                    {(policy.discountAmount ?? 0) > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-stone-600 mb-1">Descuento aplicado:</p>
                        <p className="text-lg font-bold text-green-600">
                          -${(policy.discountAmount ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {policy.originalPremium && policy.originalPremium > policy.premium && (
                    <div className="grid md:grid-cols-2 gap-4 pt-3 border-t border-green-200">
                      <div>
                        <p className="text-xs text-stone-500 mb-1">Prima Original:</p>
                        <p className="text-sm font-medium text-stone-600 line-through">
                          ${policy.originalPremium.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500 mb-1">Prima Final (con descuento):</p>
                        <p className="text-sm font-semibold text-green-700">
                          ${policy.premium.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {policy.codeDiscountType && policy.codeDiscountValue && (
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-stone-600">
                        Tipo de descuento: {policy.codeDiscountType === "percentage" 
                          ? `${policy.codeDiscountValue}%` 
                          : `$${policy.codeDiscountValue.toLocaleString('es-MX')} fijo`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Policy Dates */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm mb-6">
            <h2 className="text-2xl font-bold mb-6 text-stone-800">Fechas Importantes</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Fecha de Compra</label>
                <p className="text-lg font-semibold text-stone-800">{policy.purchaseDate}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-600 block mb-1">Fecha de Expiración</label>
                <p className="text-lg font-semibold text-stone-800">{policy.expirationDate}</p>
              </div>
              {policy.claimDate && (
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Fecha de Reclamo</label>
                  <p className="text-lg font-semibold text-stone-800">{policy.claimDate}</p>
                </div>
              )}
              {policy.claimAmount && (
                <div>
                  <label className="text-sm font-medium text-stone-600 block mb-1">Monto Reclamado</label>
                  <p className="text-lg font-semibold text-green-600">
                    ${policy.claimAmount.toLocaleString('es-MX')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ENS Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 ring-1 ring-amber-200/50 shadow-sm mb-6">
            <h2 className="text-2xl font-bold mb-4 text-stone-800">Identidad ENS</h2>
                <p className="text-stone-700">
              Esta póliza está asociada a tu subdominio ENS:{" "}
              <span className="font-semibold text-amber-700">
                {isLoadingIdentity ? "..." : (ensSubdomain || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "N/A"))}
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {policy.status === "active" && (
              <Button size="lg" onClick={handleClaim}>Reclamar Cobertura</Button>
            )}
            <Link href="/dashboard">
              <Button variant="outline" size="lg">
                Volver al Panel
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-amber-200/50 bg-amber-50/30 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-stone-600">
          <Link href="/" className="hover:text-amber-900 transition-colors">
            Volver al Inicio
          </Link>
        </div>
      </footer>
    </div>
  );
}

