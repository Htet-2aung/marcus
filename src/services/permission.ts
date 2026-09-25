import type {
  Persona,
  } from "../config/personas.js";

import type {
  RiskLevel,
} from "../types/agent.js";

const blockedTools = new Set([
  "delete_production_database",
  "rotate_credentials",
  "disable_authentication",
  "delete_company_data",
  "transfer_money",
]);

const approvalTools = new Set([
  "send_email",
  "calendar.create",
  "github.pull_request.create",
  "send_external_slack",
  "publish_content",
]);

export function canUseTool(
  persona: Persona,
  permission: string
): boolean {
  return persona.permissions.includes(permission);
}

export function getToolRisk(
  toolName: string
): RiskLevel {

  if (blockedTools.has(toolName)) {
    return "blocked";
  }

  if (approvalTools.has(toolName)) {
    return "approval";
  }

  return "safe";
}