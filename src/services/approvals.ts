import crypto from "node:crypto";

import { env } from "../config/env.js";

import type {
  PendingApproval,
} from "../types/agent.js";

const approvals =
  new Map<string, PendingApproval>();

export function createApproval(
  params: Omit<
    PendingApproval,
    "id" | "createdAt" | "expiresAt" | "status"
  >
): PendingApproval {

  const now = new Date();

  const expires =
    new Date(
      now.getTime() +
      env.agent.approvalExpiryMinutes *
      60_000
    );

  const approval: PendingApproval = {
    ...params,

    id: crypto.randomUUID(),

    status: "pending",

    createdAt: now.toISOString(),

    expiresAt: expires.toISOString(),
  };

  approvals.set(
    approval.id,
    approval
  );

  return approval;
}

export function getApproval(
  id: string
) {

  const approval = approvals.get(id);

  if (!approval) {
    return null;
  }

  if (
    approval.status === "pending" &&
    Date.now() >
      new Date(
        approval.expiresAt
      ).getTime()
  ) {
    approval.status = "expired";
  }

  return approval;
}

export function approveAction(id: string) {

  const approval = getApproval(id);

  if (!approval) {
    throw new Error(
      "Approval request not found."
    );
  }

  if (approval.status !== "pending") {
    throw new Error(
      `Approval is ${approval.status}.`
    );
  }

  approval.status = "approved";

  return approval;
}

export function rejectAction(id: string) {

  const approval = getApproval(id);

  if (!approval) {
    throw new Error(
      "Approval request not found."
    );
  }

  approval.status = "rejected";

  return approval;
}