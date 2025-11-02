import { NextResponse } from "next/server";

// Hardcoded notifications
const notifications = [
  {
    id: "notif-001",
    type: "claim_approved",
    title: "Reclamo Aprobado",
    message: "Tu reclamo para el vuelo Y4567 ha sido aprobado. El pago se procesará en las próximas 24 horas.",
    date: "2024-02-26",
    read: false,
    policyId: "pol-002",
  },
  {
    id: "notif-002",
    type: "claim_paid",
    title: "Pago Completado",
    message: "Se ha completado el pago de $3,200 MXN por tu reclamo del vuelo Y4567.",
    date: "2024-02-27",
    read: false,
    policyId: "pol-002",
    transactionHash: "0x1234...5678",
  },
  {
    id: "notif-003",
    type: "policy_expiring",
    title: "Póliza Próxima a Expirar",
    message: "Tu póliza para el vuelo AM123 expira el 15 de marzo de 2024.",
    date: "2024-03-10",
    read: true,
    policyId: "pol-001",
  },
];

export async function GET() {
  return NextResponse.json({ notifications });
}

