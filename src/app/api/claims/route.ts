import { NextResponse } from "next/server";
import { getAllPolicies, getPoliciesByUserAddress, initializeSampleData } from "@/lib/policy-storage";

export async function GET(request: Request) {
  try {
    // Initialize sample data if storage is empty (for development)
    initializeSampleData();

    // Get user address from query parameter
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");

    let policies;
    if (userAddress) {
      // Filter by user address
      policies = getPoliciesByUserAddress(userAddress);
    } else {
      // Return all policies (for admin use or if no filter specified)
      policies = getAllPolicies();
    }

    // Convert policies with claims to claim objects
    const claims = policies
      .filter((policy) => policy.claimDate && policy.claimAmount)
      .map((policy) => {
        // Map claimStatus to the format expected by the frontend
        let claimStatus: "in_verification" | "approved" | "paid" | "rejected" = "in_verification";
        if (policy.claimStatus) {
          if (policy.claimStatus === "approved" || policy.claimStatus === "paid") {
            claimStatus = policy.claimStatus as "in_verification" | "approved" | "paid";
          } else if (policy.claimStatus === "rejected") {
            claimStatus = "rejected";
          }
        }

        // Calculate processed date (if approved/paid, use claim date + 1 day as estimate)
        let processedDate: string | null = null;
        if (claimStatus === "approved" || claimStatus === "paid") {
          const claimDateObj = new Date(policy.claimDate!);
          claimDateObj.setDate(claimDateObj.getDate() + 1);
          processedDate = claimDateObj.toISOString().split('T')[0];
        }

        // Calculate payment date if paid
        let paymentDate: string | undefined = undefined;
        if (claimStatus === "paid") {
          const claimDateObj = new Date(policy.claimDate!);
          claimDateObj.setDate(claimDateObj.getDate() + 2);
          paymentDate = claimDateObj.toISOString().split('T')[0];
        }

        return {
          id: `claim-${policy.id}`,
          policyId: policy.id,
          airline: policy.airline,
          flightNumber: policy.flightNumber,
          date: policy.date,
          status: claimStatus,
          amount: policy.claimAmount!,
          submittedDate: policy.claimDate!,
          processedDate,
          paymentDate,
          transactionHash: policy.transactionHash || undefined,
        };
      })
      .sort((a, b) => {
        // Sort by submitted date (newest first)
        return new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime();
      });

    return NextResponse.json({ claims });
  } catch (error: any) {
    console.error("Error fetching claims:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching claims" },
      { status: 500 }
    );
  }
}

