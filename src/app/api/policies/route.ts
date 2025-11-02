import { NextResponse } from "next/server";
import { getPoliciesByUserAddress, getAllPolicies, initializeSampleData } from "@/lib/policy-storage";

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

    return NextResponse.json({ policies });
  } catch (error: any) {
    console.error("Error fetching policies:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching policies" },
      { status: 500 }
    );
  }
}

