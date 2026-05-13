import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { getAccessToken } from "@/lib/axios";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://localhost:7001/api/v1";
const HUB_URL = new URL("/hubs/dashboard", API_BASE).toString();

export type DashboardEvent =
  | "AppointmentChanged"
  | "LabOrderChanged"
  | "BillingChanged"
  | "InventoryChanged"
  | "CajaChanged"
  | "CriticalLabResult";

export interface CriticalLabResultPayload {
  labOrderId: string;
  patientId: string;
  testName: string;
  value: string;
}

let connection: HubConnection | null = null;

function build(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getAccessToken() ?? "",
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();
}

export async function connectDashboardHub(): Promise<HubConnection> {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    return connection;
  }
  connection = build();
  await connection.start();
  return connection;
}

export async function disconnectDashboardHub(): Promise<void> {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    await connection.stop();
  }
  connection = null;
}

export function getDashboardConnection(): HubConnection | null {
  return connection;
}
