"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { getTranslations } from "@/lib/translations";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

interface Claim {
  id: string;
  policyId: string;
  airline: string;
  flightNumber: string;
  date: string;
  status: "in_verification" | "approved" | "paid" | "rejected";
  amount: number;
  submittedDate: string;
  processedDate: string | null;
  paymentDate?: string;
  transactionHash?: string;
}

export default function Claims() {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const router = useRouter();
  const { authenticated, ready } = usePrivy();
  const { address } = useAccount();
  const [filter, setFilter] = useState<"all" | "in_verification" | "approved" | "paid">("all");
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Fetch claims from API
  useEffect(() => {
    const fetchClaims = async () => {
      if (!address || !authenticated || !ready) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/claims?userAddress=${address}`);
        if (response.ok) {
          const data = await response.json();
          setClaims(data.claims || []);
        } else {
          console.error("Error fetching claims:", response.statusText);
          setClaims([]);
        }
      } catch (error) {
        console.error("Error fetching claims:", error);
        setClaims([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaims();
  }, [address, authenticated, ready]);

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

  // Show loading while fetching claims
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100">
        <Header />
        <main className="container mx-auto px-4 py-8 lg:py-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                <p className="text-stone-600">
                  {language === "es" ? "Cargando reclamos..." : "Loading claims..."}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      in_verification: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-blue-100 text-blue-800 border-blue-200",
      paid: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
    };
    const labels: Record<string, string> = {
      in_verification: t.claims.status.inVerification,
      approved: t.claims.status.approved,
      paid: t.claims.status.paid,
      rejected: t.claims.status.rejected,
    };
    return (
      <span className={`px-4 py-2 rounded-full text-sm font-medium border ${styles[status] || styles.in_verification}`}>
        {labels[status] || labels.in_verification}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100">
      <Header />

      <main className="container mx-auto px-4 py-8 lg:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-stone-800">{t.claims.title}</h1>
            <p className="text-lg text-stone-600">
              {t.claims.subtitle}
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-2 flex-wrap">
            <button 
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-amber-200 text-stone-700 hover:bg-amber-50"
              }`}
            >
              {t.claims.filters.all}
            </button>
            <button 
              onClick={() => setFilter("in_verification")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "in_verification"
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-amber-200 text-stone-700 hover:bg-amber-50"
              }`}
            >
              {t.claims.filters.inVerification}
            </button>
            <button 
              onClick={() => setFilter("approved")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "approved"
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-amber-200 text-stone-700 hover:bg-amber-50"
              }`}
            >
              {t.claims.filters.approved}
            </button>
            <button 
              onClick={() => setFilter("paid")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "paid"
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-amber-200 text-stone-700 hover:bg-amber-50"
              }`}
            >
              {t.claims.filters.paid}
            </button>
          </div>

          {/* Claims List */}
          <div className="space-y-4">
            {claims
              .filter((claim) => {
                if (filter === "all") return true;
                return claim.status === filter;
              })
              .map((claim) => (
              <div
                key={claim.id}
                className="bg-white/80 backdrop-blur-sm rounded-xl p-6 ring-1 ring-amber-200/50 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xl font-semibold text-stone-800">
                        {claim.airline} {claim.flightNumber}
                      </h3>
                      {getStatusBadge(claim.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-stone-600">{t.claims.fields.amount}:</span>
                        <p className="font-semibold text-stone-800">
                          ${claim.amount.toLocaleString(language === 'es' ? 'es-MX' : 'en-US')}
                        </p>
                      </div>
                      <div>
                        <span className="text-stone-600">{t.claims.fields.flightDate}:</span>
                        <p className="font-medium text-stone-800">{claim.date}</p>
                      </div>
                      <div>
                        <span className="text-stone-600">{t.claims.fields.submitted}:</span>
                        <p className="font-medium text-stone-800">{claim.submittedDate}</p>
                      </div>
                      {claim.processedDate && (
                        <div>
                          <span className="text-stone-600">{t.claims.fields.processed}:</span>
                          <p className="font-medium text-stone-800">{claim.processedDate}</p>
                        </div>
                      )}
                    </div>
                    {claim.paymentDate && (
                      <div className="mt-2 text-sm">
                        <span className="text-stone-600">{t.claims.fields.paidOn} {claim.paymentDate}</span>
                        {claim.transactionHash && (
                          <span className="ml-2 text-amber-700 font-mono text-xs">
                            {claim.transactionHash}
                          </span>
                        )}
                      </div>
                    )}
                    {claim.status === "in_verification" && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          {t.claims.verificationMessage}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/policy/${claim.policyId}`}>
                      <Button variant="outline" size="sm">
                        {t.claims.buttons.viewPolicy}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isLoading && claims.length === 0 && (
            <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl ring-1 ring-amber-200/50">
              <p className="text-stone-600 mb-4">{t.claims.noClaims}</p>
              <Link href="/dashboard">
                <Button>{t.claims.buttons.viewPolicies}</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

