"use client";

import { Suspense, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";

function RefreshContent() {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const refreshSession = async () => {
      try {
        const token = await getAccessToken();
        const redirectUri = searchParams.get("redirect_uri") || "/dashboard";

        if (token) {
          // User is authenticated, redirect to intended page
          router.push(redirectUri);
        } else {
          // User is not authenticated, redirect to home
          router.push("/");
        }
      } catch (error) {
        console.error("Error refreshing session:", error);
        // On error, redirect to home
        router.push("/");
      }
    };

    refreshSession();
  }, [getAccessToken, router, searchParams]);

  // Show loading state while refreshing
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p className="text-stone-600">Refreshing session...</p>
      </div>
    </div>
  );
}

export default function RefreshPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50/30 to-stone-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-stone-600">Loading...</p>
          </div>
        </div>
      }
    >
      <RefreshContent />
    </Suspense>
  );
}

