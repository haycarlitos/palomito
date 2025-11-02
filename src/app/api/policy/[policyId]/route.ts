import { NextResponse } from "next/server";
import { getPolicyById, initializeSampleData } from "@/lib/policy-storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    // Initialize sample data if storage is empty (for development)
    initializeSampleData();

    const { policyId } = await params;
    
    // Handle onchain policies - return 404 with helpful message
    if (policyId.startsWith('onchain-')) {
      return NextResponse.json(
        { 
          error: "Esta póliza existe solo en el contrato inteligente. Los detalles completos no están disponibles en el almacenamiento.",
          policyId,
          isOnchain: true
        },
        { status: 404 }
      );
    }

    const policy = getPolicyById(policyId);

    if (!policy) {
      return NextResponse.json(
        { error: "Póliza no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ policy });
  } catch (error: any) {
    console.error("Error fetching policy:", error);
    return NextResponse.json(
      { error: error.message || "Error fetching policy" },
      { status: 500 }
    );
  }
}

