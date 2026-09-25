import cron from "node-cron";
import type { WebClient } from "@slack/web-api";
import { env } from "../config/env.js";


/* =========================================================
   TYPES
========================================================= */

interface WorkforceMessage {
  text: string;
}


/* =========================================================
   MARCUS DAILY ANNOUNCEMENTS
========================================================= */

const morningAnnouncements: WorkforceMessage[] = [

  {
    text:
      `🌅 *Good morning, everyone.*\n\n` +
      `Let's get the day moving.\n\n` +
      `Please take a few minutes to check your priorities for today, ` +
      `update anything you're currently working on, and flag anything ` +
      `that may need attention from the team.\n\n` +
      `Before getting started, please make sure your *daily check-in* is up to date.\n\n` +
      `Have a productive day. Let's make it a good one.\n\n` +
      `— Marcus`
  },

  {
    text:
      `☀️ *Good morning, team.*\n\n` +
      `Quick morning check-in:\n\n` +
      `• What are you working on today?\n` +
      `• Is anything blocking your progress?\n` +
      `• Do you need help from another team or employee?\n\n` +
      `Please update your daily report/check-in before you get too far into the day.\n\n` +
      `Let's keep everyone aligned and moving in the same direction.\n\n` +
      `— Marcus`
  },

  {
    text:
      `👋 *Morning, everyone.*\n\n` +
      `Today's priorities are now open.\n\n` +
      `Please check your assigned work, update your daily status, and make sure ` +
      `any blockers are visible to the team.\n\n` +
      `If something has changed since yesterday, don't wait until the end of the day ` +
      `to mention it — surface it early so we can deal with it.\n\n` +
      `Let's have a strong day.\n\n` +
      `— Marcus`
  },

  {
    text:
      `🌤️ *Good morning, team.*\n\n` +
      `Before we dive in, please complete your daily check-in and review today's priorities.\n\n` +
      `If you're blocked, waiting on someone, or need a decision, flag it early.\n\n` +
      `A quick update now can save a lot of back-and-forth later.\n\n` +
      `Let's get started.\n\n` +
      `— Marcus`
  },

];


/* =========================================================
   END-OF-DAY REMINDER
========================================================= */

const dailyReportReminder =
  `📝 *Quick end-of-day check-in*\n\n` +
  `Before wrapping up today, please make sure your *daily report* is complete.\n\n` +
  `Please include:\n` +
  `• What you completed\n` +
  `• What you're still working on\n` +
  `• Any blockers or issues\n` +
  `• Anything that needs attention tomorrow\n\n` +
  `If everything is on track, a short update is perfectly fine.\n\n` +
  `Thanks, everyone.\n\n` +
  `— Marcus`;


/* =========================================================
   WEEKLY CHECK-IN
========================================================= */

const weeklyReportReminder =
  `📊 *Weekly team check-in*\n\n` +
  `It's time to close out the week.\n\n` +
  `Please complete your *weekly report* and make sure your work from this week ` +
  `is properly reflected.\n\n` +
  `Please include:\n` +
  `• Key accomplishments\n` +
  `• Important work completed\n` +
  `• Work still in progress\n` +
  `• Blockers or recurring problems\n` +
  `• Priorities for next week\n` +
  `• Anything that needs management attention\n\n` +
  `Please don't leave this until the last minute.\n\n` +
  `Thank you, team.\n\n` +
  `— Marcus`;


/* =========================================================
   RANDOM MORNING MESSAGE
========================================================= */

function getMorningAnnouncement(): string {

  const index =
    Math.floor(
      Math.random() *
      morningAnnouncements.length
    );

  return morningAnnouncements[index].text;
}


/* =========================================================
   SEND SLACK MESSAGE
========================================================= */

async function postToWorkforceChannel(
  client: WebClient,
  text: string,
) {

  const channel =
    env.workforce.announcementChannel;

  if (!channel) {

    console.warn(
      "⚠️ WORKFORCE_ANNOUNCEMENT_CHANNEL is not configured."
    );

    return;
  }


  await client.chat.postMessage({

    channel,

    text,

    unfurl_links:
      false,

    unfurl_media:
      false,
  });
}


/* =========================================================
   MORNING ANNOUNCEMENT
   09:30 — EVERY WEEKDAY
========================================================= */

export function startWorkforceScheduler(
  client: WebClient,
) {

  const timezone =
    env.workforce.timezone ||
    "Asia/Ho_Chi_Minh";


  /*
   * 09:30 Monday → Friday
   *
   * Cron:
   * ┌──────── minute
   * │ ┌────── hour
   * │ │ ┌──── day
   * │ │ │ ┌── month
   * │ │ │ │ ┌ day-of-week
   * │ │ │ │ │
   * 30 9 * * 1-5
   */

  cron.schedule(
    "30 9 * * 1-5",

    async () => {

      try {

        await postToWorkforceChannel(
          client,
          getMorningAnnouncement(),
        );

        console.log(
          "🌅 Marcus posted the morning workforce announcement."
        );

      } catch (error) {

        console.error(
          "❌ Morning workforce announcement failed:",
          error
        );

      }

    },

    {
      timezone,
    },
  );


  /* =======================================================
     END OF DAY REPORT REMINDER
     17:00 — MONDAY → FRIDAY
  ======================================================= */

  cron.schedule(
    "0 17 * * 1-5",

    async () => {

      try {

        await postToWorkforceChannel(
          client,
          dailyReportReminder,
        );

        console.log(
          "📝 Marcus posted the daily report reminder."
        );

      } catch (error) {

        console.error(
          "❌ Daily report reminder failed:",
          error
        );

      }

    },

    {
      timezone,
    },
  );


  /* =======================================================
     WEEKLY REPORT
     16:00 — FRIDAY
  ======================================================= */

  cron.schedule(
    "0 16 * * 5",

    async () => {

      try {

        await postToWorkforceChannel(
          client,
          weeklyReportReminder,
        );

        console.log(
          "📊 Marcus posted the weekly report reminder."
        );

      } catch (error) {

        console.error(
          "❌ Weekly report reminder failed:",
          error
        );

      }

    },

    {
      timezone,
    },
  );


  console.log(
    `🕘 Workforce scheduler started (${timezone})`
  );

  console.log(
    "🌅 Marcus: weekday morning announcement — 09:30"
  );

  console.log(
    "📝 Marcus: weekday daily report reminder — 17:00"
  );

  console.log(
    "📊 Marcus: Friday weekly report reminder — 16:00"
  );
}

