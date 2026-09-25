import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import nodemailer from "nodemailer";

import { env } from "../config/env.js";
import type {
  EmployeeId,
  RiskLevel,
} from "../types/agent.js";

import {
  findSlackChannel,
  sendSlackMessage,
} from "./slack.js";
/* =========================================================
   TOOL TYPES
========================================================= */

export interface ToolExecutionContext {

  employeeId: EmployeeId;

  requestingUserId?: string;

  slackChannel?: string;

  slackThreadTs?: string;

  coordinateEmployee?: (
    employeeId: EmployeeId,
    task: string,
    details?: string,
  ) => Promise<unknown>;
}


export interface ToolExecutionResult {

  success: boolean;

  result?: unknown;

  error?: string;

  risk: RiskLevel;
}


/* =========================================================
   TOOL DEFINITIONS
========================================================= */

export const toolDefinitions = [

  /* =======================================================
     SEND EMAIL
  ======================================================= */

  {
    type: "function" as const,

    function: {
      name: "send_email",

      description:
        "Draft or send an email directly to a recipient. " +
        "Do not delegate straightforward email requests.",

      parameters: {
        type: "object",

        properties: {
          to: {
            type: "string",
            description:
              "Recipient email address.",
          },

          subject: {
            type: "string",
            description:
              "Email subject.",
          },

          body: {
            type: "string",
            description:
              "Complete email body.",
          },

          mode: {
            type: "string",
            enum: [
              "draft",
              "send",
            ],
            description:
              "draft prepares the email. send requests delivery.",
          },
        },

        required: [
          "to",
          "subject",
          "body",
          "mode",
        ],

        additionalProperties: false,
      },
    },
  },


  /* =======================================================
     SLACK FIND CHANNEL
  ======================================================= */

  {
    type: "function" as const,

    function: {
      name: "slack.find_channel",

      description:
        "Find a Slack channel by name or channel ID. " +
        "Use this when the user refers to a channel such as #example.",

      parameters: {
        type: "object",

        properties: {
          channel: {
            type: "string",
            description:
              "Slack channel name such as #example or a Slack channel ID.",
          },
        },

        required: [
          "channel",
        ],

        additionalProperties: false,
      },
    },
  },


  /* =======================================================
     SEND SLACK MESSAGE
  ======================================================= */

  {
    type: "function" as const,

    function: {
      name: "slack.send_message",

      description:
        "Send a Slack message directly to a channel or thread. " +
        "Use this when the user explicitly asks you to send, tell, announce, " +
        "notify, or communicate something in Slack. " +
        "Do not delegate straightforward Slack messaging to another employee. " +
        "When the user gives a channel such as #example, use slack.find_channel " +
        "first if necessary, then use this tool.",

      parameters: {
        type: "object",

        properties: {
          channel: {
            type: "string",
            description:
              "Slack channel ID or resolved Slack channel name.",
          },

          text: {
            type: "string",
            description:
              "The complete message to send to Slack.",
          },

          threadTs: {
            type: "string",
            description:
              "Slack thread timestamp. Use an empty string for a new channel message; use the existing timestamp for a thread reply.",
          },
        },

        required: [
          "channel",
          "text",
          "threadTs",
        ],

        additionalProperties: false,
      },
    },
  },


  /* =======================================================
     EMPLOYEE COORDINATION
  ======================================================= */

  {
    type: "function" as const,

    function: {
      name: "employee.coordinate",

      description:
        "Delegate a meaningful task to another AI employee. " +
        "Do not use this for simple Slack messages or straightforward email requests.",

      parameters: {
        type: "object",

        properties: {
          employeeId: {
            type: "string",

            enum: [
              "ops",
              "hr",
              "developer",
              "marketing",
              "sales",
              "finance",
              "project_manager",
              "support",
              "research",
              "qa",
            ],

            description:
              "Employee who should receive the task.",
          },

          task: {
            type: "string",
            description:
              "Concrete task to delegate.",
          },

          details: {
            type: "string",
            description:
              "Additional context.",
          },
        },

        required: [
          "employeeId",
          "task",
        ],

        additionalProperties: false,
      },
    },
  },


  /* =======================================================
     MARKDOWN DOCUMENT
  ======================================================= */

  {
    type: "function" as const,

    function: {
      name:
        "create_markdown_document",

      description:
        "Create a readable Markdown document for long reports, " +
        "technical content, research, or large structured information.",

      parameters: {
        type: "object",

        properties: {
          title: {
            type: "string",
            description:
              "Human-readable document title.",
          },

          content: {
            type: "string",
            description:
              "Complete Markdown document content.",
          },

          filename: {
            type: "string",
            description:
              "Markdown filename ending in .md.",
          },
        },

        required: [
          "title",
          "content",
          "filename",
        ],

        additionalProperties: false,
      },
    },
  },
];


/* =========================================================
   AVAILABLE TOOL NAME CHECK
========================================================= */

export function getAvailableToolNames(): Set<string> {

  return new Set(
    toolDefinitions.map(
      (tool) =>
        tool.function.name,
    ),
  );
}


/* =========================================================
   EMAIL TRANSPORT
========================================================= */

function createTransport() {

  if (
    !env.gmail.address ||
    !env.gmail.appPassword
  ) {

    throw new Error(
      "Gmail configuration is missing. " +
      "Set MARCUS_GMAIL_ADDRESS and " +
      "MARCUS_GMAIL_APP_PASSWORD.",
    );
  }


  return nodemailer.createTransport({

    service:
      "gmail",

    auth: {

      user:
        env.gmail.address,

      pass:
        env.gmail.appPassword,
    },
  });
}


/* =========================================================
   SEND EMAIL
========================================================= */

async function sendEmail(
  args: {
    to: string;
    subject: string;
    body: string;
  },
) {

  const transport =
    createTransport();


  const info =
    await transport.sendMail({

      from:
        env.gmail.address,

      to:
        args.to,

      subject:
        args.subject,

      text:
        args.body,
    });


  return {

    success: true,

    messageId:
      info.messageId,

    to:
      args.to,

    subject:
      args.subject,
  };
}


/* =========================================================
   MARKDOWN DOCUMENT
========================================================= */

async function createMarkdownDocument(
  args: {
    title: string;
    content: string;
    filename?: string;
  },
) {

  const documentsDirectory =
    path.resolve(
      process.env.DOCUMENTS_DIR ||
      "./data/documents",
    );


  await fs.mkdir(
    documentsDirectory,
    {
      recursive: true,
    },
  );


  const safeTitle =
    args.title
      .trim()
      .replace(
        /[^a-zA-Z0-9-_ ]/g,
        "",
      )
      .replace(
        /\s+/g,
        "-",
      )
      .toLowerCase();


  const generatedFilename =
    `${safeTitle || "document"}-` +
    `${crypto.randomBytes(4).toString("hex")}.md`;


  const filename =
    args.filename?.trim() ||
    generatedFilename;


  const safeFilename =
    filename
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-",
      );


  const finalFilename =
    safeFilename.endsWith(".md")
      ? safeFilename
      : `${safeFilename}.md`;


  const filePath =
    path.join(
      documentsDirectory,
      finalFilename,
    );


  await fs.writeFile(
    filePath,
    args.content,
    "utf8",
  );


  return {

    success: true,

    title:
      args.title,

    filename:
      finalFilename,

    path:
      filePath,

    format:
      "markdown",

    bytes:
      Buffer.byteLength(
        args.content,
        "utf8",
      ),
  };
}


/* =========================================================
   TOOL RISK
========================================================= */

export function getToolRisk(
  toolName: string,
): RiskLevel {

  switch (toolName) {

    case "slack.find_channel":
      return "safe";

    case "slack.send_message":
      return "safe";

    case "send_email":
      return "approval";

    case "employee.coordinate":
      return "safe";

    case "create_markdown_document":
      return "safe";

    default:
      return "blocked";
  }
}

/* =========================================================
   TOOL EXECUTOR
========================================================= */

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: ToolExecutionContext,
): Promise<ToolExecutionResult> {

  const availableTools =
    getAvailableToolNames();

/* -------------------------------------------------------
   SLACK FIND CHANNEL
------------------------------------------------------- */

if (
  toolName ===
  "slack.find_channel"
) {

  const channel =
    typeof args.channel === "string"
      ? args.channel.trim()
      : "";

  if (!channel) {

    return {
      success: false,

      error:
        "slack.find_channel requires a channel name or ID.",

      risk: "safe",
    };
  }

  try {

    const result =
      await findSlackChannel(
        channel,
      );

    return {

      success: true,

      result,

      risk: "safe",
    };

  } catch (error) {

    return {

      success: false,

      error:
        error instanceof Error
          ? error.message
          : String(error),

      risk: "safe",
    };
  }
}


/* -------------------------------------------------------
   SEND SLACK MESSAGE
------------------------------------------------------- */

if (
  toolName ===
  "slack.send_message"
) {

  const channel =
    typeof args.channel === "string"
      ? args.channel.trim()
      : "";

  const text =
    typeof args.text === "string"
      ? args.text.trim()
      : "";

  const threadTs =
    typeof args.threadTs === "string" &&
    args.threadTs.trim()
      ? args.threadTs.trim()
      : undefined;


  if (!channel) {

    return {

      success: false,

      error:
        "slack.send_message requires a channel.",

      risk: "safe",
    };
  }


  if (!text) {

    return {

      success: false,

      error:
        "slack.send_message requires message text.",

      risk: "safe",
    };
  }


  try {

    /*
     * Resolve #channel names automatically.
     */
    const slackReference = channel.match(
      /^<#([A-Z0-9]+)(?:\|[^>]+)?>$/i,
    );

    let resolvedChannel =
      slackReference?.[1] ||
      channel;

    if (
      !slackReference &&
      (channel.startsWith("#") ||
        !/^[CGD][A-Z0-9]+$/i.test(channel))
    ) {

      const found =
        await findSlackChannel(
          channel,
        );

      resolvedChannel =
        found.channelId;
    }


    const result =
      await sendSlackMessage({

        channel:
          resolvedChannel,

        text,

        threadTs,
      });


    return {

      success: true,

      result: {

        ...result,

        requestedChannel:
          channel,

        resolvedChannel,
      },

      risk: "safe",
    };

  } catch (error) {

    return {

      success: false,

      error:
        error instanceof Error
          ? error.message
          : String(error),

      risk: "safe",
    };
  }
}
  /* -------------------------------------------------------
     NEVER execute unknown tools
  ------------------------------------------------------- */

  if (
    !availableTools.has(
      toolName,
    )
  ) {

    return {

      success: false,

      error:
        `Tool "${toolName}" is not registered.`,

      risk:
        "blocked",
    };
  }


  /* -------------------------------------------------------
     EMAIL
  ------------------------------------------------------- */

  if (
    toolName ===
    "send_email"
  ) {

    const to =
      typeof args.to === "string"
        ? args.to
        : "";

    const subject =
      typeof args.subject === "string"
        ? args.subject
        : "";

    const body =
      typeof args.body === "string"
        ? args.body
        : "";


    if (
      !to ||
      !subject ||
      !body
    ) {

      return {

        success: false,

        error:
          "send_email requires to, subject, and body.",

        risk:
          "approval",
      };
    }


    /*
     * The LLM is allowed to REQUEST the action,
     * but the actual execution should happen only
     * after your approval system approves it.
     *
     * The current llm.ts will mark this as pending
     * approval rather than silently sending.
     */

    return {

      success: true,

      result: {

        requiresApproval:
          true,

        action:
          "send_email",

        to,

        subject,

        body,
      },

      risk:
        "approval",
    };
  }


  /* -------------------------------------------------------
     EMPLOYEE COORDINATION
  ------------------------------------------------------- */

  if (
    toolName ===
    "employee.coordinate"
  ) {

    const employeeId =
      typeof args.employeeId === "string"
        ? args.employeeId as EmployeeId
        : undefined;

    const task =
      typeof args.task === "string"
        ? args.task
        : "";

    const details =
      typeof args.details === "string"
        ? args.details
        : "";


    if (
      !employeeId ||
      !task
    ) {

      return {

        success: false,

        error:
          "employee.coordinate requires employeeId and task.",

        risk:
          "safe",
      };
    }


    if (
      !context.coordinateEmployee
    ) {

      return {

        success: false,

        error:
          "Employee coordination is not currently available.",

        risk:
          "safe",
      };
    }


    const result =
      await context.coordinateEmployee(
        employeeId,
        task,
        details,
      );


    return {

      success: true,

      result,

      risk:
        "safe",
    };
  }


  /* -------------------------------------------------------
     MARKDOWN
  ------------------------------------------------------- */

  if (
    toolName ===
    "create_markdown_document"
  ) {

    const title =
      typeof args.title === "string"
        ? args.title
        : "Document";

    const content =
      typeof args.content === "string"
        ? args.content
        : "";

    const filename =
      typeof args.filename === "string"
        ? args.filename
        : undefined;


    if (!content) {

      return {

        success: false,

        error:
          "Document content cannot be empty.",

        risk:
          "safe",
      };
    }


    const result =
      await createMarkdownDocument({

        title,

        content,

        filename,
      });


    return {

      success: true,

      result,

      risk:
        "safe",
    };
  }


  return {

    success: false,

    error:
      `No executor exists for "${toolName}".`,

    risk:
      "blocked",
  };
}


/* =========================================================
   ACTUALLY SEND APPROVED EMAIL
========================================================= */

export async function executeApprovedEmail(
  args: {
    to: string;
    subject: string;
    body: string;
  },
) {

  return sendEmail(
    args,
  );
}