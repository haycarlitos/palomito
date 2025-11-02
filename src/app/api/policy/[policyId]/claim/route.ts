import { NextResponse } from "next/server";
import { getPolicyById, updatePolicy, storeContractPolicy, initializeSampleData } from "@/lib/policy-storage";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ policyId: string }> }
) {
  let policyId: string = "";
  try {
    // Initialize sample data if storage is empty (for development)
    initializeSampleData();

    const resolvedParams = await params;
    policyId = resolvedParams.policyId;
    const body = await request.json();
    const amount = body.amount || 0;
    const userAddress = body.userAddress || "";

    // Check if this is an on-chain policy
    const isOnchainPolicy = policyId.startsWith('onchain-');

    // Log for debugging
    console.log("Claim request:", { policyId, amount, userAddress, isOnchainPolicy });

    // Get the policy
    let policy = getPolicyById(policyId);
    
    // Declare claimDate at a higher scope so it's accessible later
    const claimDate = new Date().toISOString().split('T')[0];
    
    // If policy doesn't exist and it's an on-chain policy, create a minimal record
    let updatedPolicy;
    if (!policy && isOnchainPolicy && userAddress) {
      // Create policy directly with the onchain policy ID
      policy = {
        id: policyId,
        userAddress,
        airline: "", // Not available from on-chain policy
        flightNumber: "", // Not available from on-chain policy
        date: claimDate,
        ticketPrice: amount,
        premium: 0,
        originalPremium: 0,
        discountAmount: 0,
        status: "claimed",
        expirationDate: claimDate,
        purchaseDate: claimDate,
        transactionHash: "",
        claimDate,
        claimAmount: amount,
        claimStatus: "in_verification",
      };
      storeContractPolicy(policy);
      updatedPolicy = policy;
    } else if (!policy) {
      // If it's an on-chain policy but no userAddress provided, return a helpful error
      if (isOnchainPolicy && !userAddress) {
        return NextResponse.json(
          { error: "User address is required for on-chain policy claims" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Policy not found" },
        { status: 404 }
      );
    } else {
      // Update existing policy with claim information
      updatedPolicy = updatePolicy(policyId, {
        status: "claimed",
        claimDate,
        claimAmount: amount,
        claimStatus: "in_verification",
      });
    }

    if (!updatedPolicy) {
      return NextResponse.json(
        { error: "Failed to update policy" },
        { status: 500 }
      );
    }

    const claim = {
      id: `claim-${Date.now()}`,
      policyId: policyId,
      status: "in_verification",
      amount,
      submittedDate: claimDate,
      message: "Reclamo enviado exitosamente. Está en proceso de verificación.",
    };

    return NextResponse.json({ 
      claim,
      policy: updatedPolicy,
      message: "Reclamo procesado exitosamente"
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error processing claim:", error);
    console.error("Error stack:", error.stack);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      policyId: policyId,
    });
    return NextResponse.json(
      { 
        error: error.message || "Error processing claim",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

