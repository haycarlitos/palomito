import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Hardcoded promo codes database (in production, this would be in a database)
const PROMO_CODES: Record<string, {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUses?: number;
  currentUses: number;
  expiresAt?: string;
  minTicketPrice?: number;
  isValid: boolean;
}> = {
  "WELCOME10": {
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    maxUses: 100,
    currentUses: 45,
    expiresAt: "2024-12-31",
    isValid: true,
  },
  "SAVE50": {
    code: "SAVE50",
    discountType: "fixed",
    discountValue: 50,
    maxUses: 50,
    currentUses: 50, // Fully used
    isValid: true,
  },
  "FLIGHT20": {
    code: "FLIGHT20",
    discountType: "percentage",
    discountValue: 20,
    maxUses: 200,
    currentUses: 120,
    expiresAt: "2024-06-30",
    minTicketPrice: 5000,
    isValid: true,
  },
  "EARLYBIRD": {
    code: "EARLYBIRD",
    discountType: "percentage",
    discountValue: 15,
    maxUses: undefined,
    currentUses: 0,
    expiresAt: "2024-03-31", // Expired
    isValid: true,
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, ticketPrice, userAddress } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Código promocional requerido" },
        { status: 400 }
      );
    }

    if (!ticketPrice || ticketPrice <= 0) {
      return NextResponse.json(
        { error: "Precio del boleto requerido" },
        { status: 400 }
      );
    }

    const promoCode = PROMO_CODES[code.toUpperCase()];

    // Check if code exists
    if (!promoCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Código inválido",
          message: "El código promocional ingresado no es válido.",
        },
        { status: 404 }
      );
    }

    // Check if code has expired
    if (promoCode.expiresAt) {
      const expiryDate = new Date(promoCode.expiresAt);
      const today = new Date();
      if (expiryDate < today) {
        return NextResponse.json(
          {
            success: false,
            error: "Código expirado",
            message: `Este código expiró el ${expiryDate.toLocaleDateString("es-MX")}.`,
          },
          { status: 400 }
        );
      }
    }

    // Check if code has reached max uses
    if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
      return NextResponse.json(
        {
          success: false,
          error: "Código agotado",
          message: "Este código promocional ya alcanzó su límite de usos.",
        },
        { status: 400 }
      );
    }

    // Check minimum ticket price requirement
    if (promoCode.minTicketPrice && ticketPrice < promoCode.minTicketPrice) {
      return NextResponse.json(
        {
          success: false,
          error: "Precio mínimo requerido",
          message: `Este código requiere un precio mínimo de $${promoCode.minTicketPrice.toLocaleString("es-MX")}.`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discountType === "percentage") {
      discountAmount = (ticketPrice * promoCode.discountValue) / 100;
    } else {
      discountAmount = Math.min(promoCode.discountValue, ticketPrice); // Don't discount more than ticket price
    }

    const originalPremium = ticketPrice * 0.05;
    const discountedPremium = Math.max(0, originalPremium - discountAmount);
    const finalPremium = discountedPremium;

    // Calculate remaining uses
    const remainingUses = promoCode.maxUses 
      ? promoCode.maxUses - promoCode.currentUses 
      : null;

    return NextResponse.json({
      success: true,
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      discountAmount,
      originalTicketPrice: ticketPrice,
      originalPremium,
      discountedPremium: finalPremium,
      finalPremium,
      remainingUses,
      expiresAt: promoCode.expiresAt,
      message: `¡Código aplicado exitosamente! Descuento de $${discountAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} aplicado.`,
    });
  } catch (error) {
    console.error("Error applying promo code:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al procesar el código",
        message: "Ocurrió un error al validar el código promocional.",
      },
      { status: 500 }
    );
  }
}

