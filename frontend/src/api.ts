export type Role = "VIEWER" | "MEMBER" | "LEAD" | "ADMIN";
export type Status =
  "OPEN" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "RESOLVED" | "CLOSED";
export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ItemType =
  "INCIDENT" | "CUSTOMER_ISSUE" | "PAYMENT" | "COMPLIANCE" | "TASK";
export interface User {
  id: string;
  name: string;
  email: string;
}
export interface Team {
  id: string;
  name: string;
  role: Role;
}
export interface Member {
  id: string;
  name: string;
  role: Role;
}
export interface Item {
  id: string;
  title: string;
  description: string;
  type: ItemType;
  priority: Priority;
  status: Status;
  teamId: string;
  teamName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string;
  dueDate: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
export interface Activity {
  id: number;
  actorId: string;
  actorName: string;
  eventType: string;
  details: Record<string, unknown>;
  createdAt: string;
}
export interface Comment {
  id: number;
  actorId: string;
  actorName: string;
  body: string;
  createdAt: string;
}
export interface Summary {
  metrics: {
    active: number;
    mine: number;
    urgent: number;
    approvals: number;
    overdue: number;
    completed: number;
  };
  distribution: { status: Status; count: number }[];
  recent: {
    id: number;
    event_type: string;
    created_at: string;
    actor_name: string;
    title: string;
    item_id: string;
  }[];
}
let token: string | null = null;
export function setToken(value: string | null) {
  token = value;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      ...options,
      signal: options.signal ?? AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK",
      "Cannot reach NewtonOps. Check your connection and try again.",
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && path != "/auth/login")
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      response.status,
      body?.code ?? "REQUEST_FAILED",
      body?.message ?? "The request failed. Please try again.",
      body?.fields ?? {},
    );
  }
  return body as T;
}
export function params(
  values: Record<string, string | number | undefined | null>,
) {
  const p = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  return p.toString();
}
export const statuses: Status[] = [
  "OPEN",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
  "RESOLVED",
  "CLOSED",
];
export const priorities: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
export const types: ItemType[] = [
  "INCIDENT",
  "CUSTOMER_ISSUE",
  "PAYMENT",
  "COMPLIANCE",
  "TASK",
];
export const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (s) => s.toUpperCase());
export const isLead = (role?: Role) => role === "LEAD" || role === "ADMIN";
export function transitions(item: Item, role: Role, userId: string): Status[] {
  if (
    role === "VIEWER" ||
    item.status === "CLOSED" ||
    (!isLead(role) && item.assigneeId !== userId)
  )
    return [];
  if (item.status === "AWAITING_APPROVAL")
    return isLead(role) ? ["RESOLVED", "IN_PROGRESS"] : [];
  if (!item.assigneeId) return [];
  return {
    OPEN: ["IN_PROGRESS"],
    IN_PROGRESS: ["AWAITING_APPROVAL"],
    RESOLVED: ["CLOSED"],
  }[item.status] as Status[];
}
