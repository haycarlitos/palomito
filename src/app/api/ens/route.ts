import { NextResponse } from "next/server";

export async function GET() {
  // Hardcoded ENS data
  const ensData = {
    subdomain: "usuario.palomito.eth",
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    avatar: null,
    registered: true,
  };

  return NextResponse.json({ ens: ensData });
}

export async function POST(request: Request) {
  const body = await request.json();

  // Hardcoded registration response
  const ensData = {
    subdomain: body.subdomain || "usuario.palomito.eth",
    address: body.address || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    registered: true,
    transactionHash: "0xabcdef1234567890",
  };

  return NextResponse.json({ 
    ens: ensData,
    message: "Subdominio ENS registrado exitosamente"
  }, { status: 201 });
}

