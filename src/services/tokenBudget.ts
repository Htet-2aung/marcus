import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../config/env.js";
import type { EmployeeId } from "../types/agent.js";


/* =========================================================
   TYPES
========================================================= */

interface UsageEntry {
  employeeId: string;
  provider: string;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  timestamp: string;
}

interface UsageDatabase {
  entries: UsageEntry[];
}


/* =========================================================
   TOKEN BUDGET MANAGER
========================================================= */

class TokenBudgetManager {

  private database: UsageDatabase = {
    entries: [],
  };

  private initialized = false;

  private async ensureLoaded(): Promise<void> {

    if (this.initialized) {
      return;
    }

    this.initialized = true;

    try {

      const directory =
        path.dirname(
          env.tokenBudget.dataFile,
        );

      await fs.mkdir(
        directory,
        {
          recursive: true,
        },
      );

      const content =
        await fs.readFile(
          env.tokenBudget.dataFile,
          "utf8",
        );

      const parsed =
        JSON.parse(content);

      if (
        parsed &&
        Array.isArray(parsed.entries)
      ) {
        this.database =
          parsed;
      }

    } catch {

      this.database = {
        entries: [],
      };

      await this.persist();
    }
  }


  /* =======================================================
     DATE HELPERS
  ======================================================= */

  private getStartOfDay(): number {

    const now =
      new Date();

    return Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
  }


  private getStartOfWeek(): number {

    const now =
      new Date();

    const day =
      now.getUTCDay();

    const daysSinceMonday =
      day === 0
        ? 6
        : day - 1;

    const monday =
      new Date(now);

    monday.setUTCDate(
      now.getUTCDate() -
      daysSinceMonday,
    );

    monday.setUTCHours(
      0,
      0,
      0,
      0,
    );

    return monday.getTime();
  }


  private cleanup(): void {

    const weekStart =
      this.getStartOfWeek();

    this.database.entries =
      this.database.entries.filter(
        (entry) =>
          new Date(
            entry.timestamp,
          ).getTime() >= weekStart,
      );
  }


  private async persist(): Promise<void> {

    const directory =
      path.dirname(
        env.tokenBudget.dataFile,
      );

    await fs.mkdir(
      directory,
      {
        recursive: true,
      },
    );

    await fs.writeFile(
      env.tokenBudget.dataFile,

      JSON.stringify(
        this.database,
        null,
        2,
      ),

      "utf8",
    );
  }


  /* =======================================================
     USAGE
  ======================================================= */

  async getUsage(
    employeeId?: string,
  ) {

    await this.ensureLoaded();

    this.cleanup();

    const now =
      Date.now();

    const dayStart =
      this.getStartOfDay();

    const weekStart =
      this.getStartOfWeek();


    const weeklyEntries =
      this.database.entries.filter(
        (entry) =>
          new Date(
            entry.timestamp,
          ).getTime() >= weekStart,
      );


    const dailyEntries =
      this.database.entries.filter(
        (entry) =>
          new Date(
            entry.timestamp,
          ).getTime() >= dayStart,
      );


    const employeeEntries =
      employeeId
        ? weeklyEntries.filter(
            (entry) =>
              entry.employeeId ===
              employeeId,
          )
        : [];


    const sum =
      (
        entries: UsageEntry[],
      ) =>
        entries.reduce(
          (
            total,
            entry,
          ) =>
            total +
            entry.totalTokens,
          0,
        );


    const weeklyUsed =
      sum(weeklyEntries);

    const dailyUsed =
      sum(dailyEntries);

    const employeeWeeklyUsed =
      sum(employeeEntries);


    return {
      weeklyUsed,
      dailyUsed,
      employeeWeeklyUsed,

      weeklyLimit:
        env.tokenBudget.weekly,

      dailyLimit:
        env.tokenBudget.daily,

      employeeWeeklyLimit:
        env.tokenBudget
          .perEmployeeWeekly,

      reserve:
        env.tokenBudget.reserve,

      weeklyRemaining:
        Math.max(
          0,

          env.tokenBudget.weekly -
          env.tokenBudget.reserve -
          weeklyUsed,
        ),

      dailyRemaining:
        Math.max(
          0,

          env.tokenBudget.daily -
          dailyUsed,
        ),

      employeeWeeklyRemaining:
        Math.max(
          0,

          env.tokenBudget
            .perEmployeeWeekly -
          employeeWeeklyUsed,
        ),

      utilization:
        env.tokenBudget.weekly > 0
          ? weeklyUsed /
            env.tokenBudget.weekly
          : 1,

      timestamp:
        new Date(
          now,
        ).toISOString(),
    };
  }


  /* =======================================================
     CAN SPEND?
  ======================================================= */

  async canSpend(
    employeeId: EmployeeId,
    estimatedTokens: number,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    usage: Awaited<
      ReturnType<
        TokenBudgetManager["getUsage"]
      >
    >;
  }> {

    const usage =
      await this.getUsage(
        employeeId,
      );


    if (
      estimatedTokens >
      env.tokenBudget.perRequest
    ) {

      return {
        allowed: false,

        reason:
          `Request exceeds the per-request ` +
          `token budget of ` +
          `${env.tokenBudget.perRequest.toLocaleString()} tokens.`,

        usage,
      };
    }


    if (
      estimatedTokens >
      usage.dailyRemaining
    ) {

      return {
        allowed: false,

        reason:
          "The daily AI token budget has been reached.",

        usage,
      };
    }


    if (
      estimatedTokens >
      usage.employeeWeeklyRemaining
    ) {

      return {
        allowed: false,

        reason:
          `This employee has reached its weekly token budget.`,

        usage,
      };
    }


    if (
      estimatedTokens >
      usage.weeklyRemaining
    ) {

      return {
        allowed: false,

        reason:
          "The workforce weekly AI token budget has been reached.",

        usage,
      };
    }


    return {
      allowed: true,
      usage,
    };
  }


  /* =======================================================
     RECORD USAGE
  ======================================================= */

  async record(
    employeeId: EmployeeId,
    provider: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<void> {

    await this.ensureLoaded();

    this.cleanup();


    this.database.entries.push({

      employeeId,

      provider,

      inputTokens,

      outputTokens,

      totalTokens:
        inputTokens +
        outputTokens,

      timestamp:
        new Date().toISOString(),
    });


    await this.persist();
  }


  /* =======================================================
     STATUS
  ======================================================= */

  async status() {

    return this.getUsage();
  }
}


/* =========================================================
   SINGLETON
========================================================= */

export const tokenBudget =
  new TokenBudgetManager();