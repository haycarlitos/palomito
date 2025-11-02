import { NextResponse } from "next/server";
import { createPolicy } from "@/lib/policy-storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.userAddress) {
      return NextResponse.json(
        { error: "User address is required" },
        { status: 400 }
      );
    }

    // Calculate premium - use provided premium if available (may include discount), otherwise calculate base
    const basePremium = body.premium !== undefined ? body.premium : (body.ticketPrice * 0.05);
    const originalPremium = body.originalPremium || basePremium;
    const discountAmount = body.discountAmount || 0;

    // Create policy with UUID
    const newPolicy = createPolicy({
      userAddress: body.userAddress,
      airline: body.airline,
      flightNumber: body.flightNumber,
      date: body.date,
      departureAirport: body.departureAirport,
      ticketPrice: body.ticketPrice,
      premium: basePremium,
      originalPremium: originalPremium,
      discountAmount: discountAmount,
      promoCode: body.promoCode || null,
      codeDiscountType: body.codeDiscountType || null,
      codeDiscountValue: body.codeDiscountValue || null,
      status: "active",
      expirationDate: body.date,
      purchaseDate: new Date().toISOString().split('T')[0],
      transactionHash: body.transactionHash || "",
      flightStatus: body.flightStatus || null,
    });

    return NextResponse.json({ 
      policy: newPolicy,
      message: "Póliza creada exitosamente"
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating policy:", error);
    return NextResponse.json(
      { error: error.message || "Error creating policy" },
      { status: 500 }
    );
  }
}

