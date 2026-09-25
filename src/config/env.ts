import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}`,
    );
  }

  return value;
}

function numberEnv(
  name: string,
  fallback: number,
): number {
  const value = Number(process.env[name]);

  return Number.isFinite(value)
    ? value
    : fallback;
}

export const env = {

  /* =======================================================
     SLACK
  ======================================================= */

  slack: {
    botToken:
      required("SLACK_BOT_TOKEN"),

    appToken:
      required("SLACK_APP_TOKEN"),
  },


  /* =======================================================
     OPENAI
  ======================================================= */

  openai: {
    apiKey:
      process.env.OPENAI_API_KEY,

    model:
      process.env.OPENAI_MODEL ||
      "gpt-5.6-luna",
  },


  /* =======================================================
     GROQ
  ======================================================= */

  groq: {
    apiKey:
      process.env.GROQ_API_KEY,

    model:
      process.env.GROQ_MODEL ||
      "openai/gpt-oss-20b",
  },


  /* =======================================================
     GEMINI
  ======================================================= */

  gemini: {
    apiKey:
      process.env.GEMINI_API_KEY,

    model:
      process.env.GEMINI_MODEL ||
      "gemini-3.8-flash",
  },


  /* =======================================================
     OPENROUTER
  ======================================================= */

  openrouter: {
    apiKey:
      process.env.OPENROUTER_API_KEY,

    model:
      process.env.OPENROUTER_MODEL ||
      "meta-llama/llama-3.3-70b-instruct:free",
  },


  /* =======================================================
     GMAIL
  ======================================================= */

  gmail: {
    address:
      process.env.MARCUS_GMAIL_ADDRESS,

    appPassword:
      process.env.MARCUS_GMAIL_APP_PASSWORD,
  },


  /* =======================================================
     AGENT
  ======================================================= */

  agent: {

    maxIterations:
      numberEnv(
        "AGENT_MAX_ITERATIONS",
        10,
      ),

    maxToolCalls:
      numberEnv(
        "AGENT_MAX_TOOL_CALLS",
        20,
      ),

    approvalExpiryMinutes:
      numberEnv(
        "APPROVAL_EXPIRY_MINUTES",
        30,
      ),
  },


  /* =======================================================
     WORKFORCE
  ======================================================= */

  workforce: {

    announcementChannel:
      process.env
        .WORKFORCE_ANNOUNCEMENT_CHANNEL ||
      "",

    timezone:
      process.env
        .WORKFORCE_TIMEZONE ||
      "Asia/Ho_Chi_Minh",
  },


  /* =======================================================
     TOKEN BUDGET
  ======================================================= */

  tokenBudget: {

    weekly:
      numberEnv(
        "AI_WEEKLY_TOKEN_BUDGET",
        2_000_000,
      ),

    daily:
      numberEnv(
        "AI_DAILY_TOKEN_BUDGET",
        350_000,
      ),

    perRequest:
      numberEnv(
        "AI_REQUEST_TOKEN_BUDGET",
        30_000,
      ),

    perEmployeeWeekly:
      numberEnv(
        "AI_EMPLOYEE_WEEKLY_TOKEN_BUDGET",
        300_000,
      ),

    reserve:
      numberEnv(
        "AI_WEEKLY_TOKEN_RESERVE",
        100_000,
      ),

    dataFile:
      process.env
        .AI_TOKEN_USAGE_FILE ||
      "./data/ai-token-usage.json",
  },

};