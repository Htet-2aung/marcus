export type EmployeeId =
  | "ops"
  | "hr"
  | "developer"
  | "marketing"
  | "sales"
  | "finance"
  | "project_manager"
  | "support"
  | "research"
  | "qa";

export type RiskLevel =
  | "safe"
  | "approval"
  | "blocked";

export interface ThreadMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AgentContext {
  slackChannel?: string;
  slackThreadTs?: string;
  requestingUserId?: string;
  requestingUserName?: string;
}

export interface AgentAction {
  id: string;
  tool: string;
  risk: RiskLevel;
  status:
    | "executed"
    | "pending_approval"
    | "failed";

  arguments: Record<string, unknown>;

  result?: unknown;

  error?: string;

  createdAt: string;
}

export interface PendingApproval {
  id: string;

  employeeId: EmployeeId;

  employeeName: string;

  tool: string;

  arguments: Record<string, unknown>;

  reason: string;

  risk: "approval";

  status:
    | "pending"
    | "approved"
    | "rejected"
    | "expired";

  createdAt: string;

  expiresAt: string;

  slackChannel?: string;

  slackThreadTs?: string;
}

export interface AgentResult {
  text: string;

  providerUsed: string;

  employeeId: EmployeeId;

  actions: AgentAction[];

  pendingApprovals: PendingApproval[];

  iterations: number;
}