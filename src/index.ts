import pkg from "@slack/bolt";

const {
  App,
  LogLevel,
} = pkg;

import {
  routeMessage,
} from "./services/router.js";

import {
  askAiEmployee,
} from "./services/llm.js";

import type {
  ThreadMessage,
} from "./types/agent.js";

import {
  env,
} from "./config/env.js";

import {
  startWorkforceScheduler,
} from "./services/workforceScheduler.js";

/* =========================================================
   SLACK APP
========================================================= */

const app =
  new App({
    token:
      env.slack.botToken,

    appToken:
      env.slack.appToken,

    socketMode:
      true,

    logLevel:
      LogLevel.INFO,
  });


/* =========================================================
   HUMAN-STYLE RESPONSE FORMATTER
========================================================= */

function formatEmployeeReply(
  persona: any,
  text: string,
  pendingApprovals: number,
): string {

  const cleanReply =
    text
      .trim()
      .replace(/^["']|["']$/g, "");

  let reply =
    `${persona.avatarEmoji} *${persona.name}*\n\n` +
    cleanReply;

  if (pendingApprovals > 0) {

    reply +=
      `\n\n⚠️ I’ll need your approval before I can complete ` +
      `${pendingApprovals === 1
        ? "that action"
        : `those ${pendingApprovals} actions`}.`;
  }

  return reply;
}


/* =========================================================
   APP MENTION
========================================================= */

app.event(
  "app_mention",

  async ({
    event,
    client,
    say,
  }) => {

    const {
      channel,
      ts,
      thread_ts,
      text,
      user,
    } = event;


    /* -----------------------------------------------------
       Determine conversation thread
    ----------------------------------------------------- */

    const replyTargetTs =
      thread_ts || ts;


    /* -----------------------------------------------------
       Determine which AI employee should handle the request
    ----------------------------------------------------- */

    const {
      persona,
      cleanText,
    } =
      routeMessage(text);


    /* -----------------------------------------------------
       Show Slack "thinking" reaction
    ----------------------------------------------------- */

    try {

      await client.reactions.add({
        channel,
        timestamp: ts,
        name: "eyes",
      });

    } catch {
      // Reaction failure should never interrupt the AI request.
    }


    try {

      /* =====================================================
         LOAD CONVERSATION HISTORY
      ===================================================== */

      const conversation =
        await client.conversations.replies({
          channel,
          ts: replyTargetTs,
          limit: 50,
        });


      const history:
        ThreadMessage[] = [];


      if (conversation.messages) {

        for (
          const msg of
          conversation.messages
        ) {

          /*
           * Don't include the current user message twice.
           */

          if (
            msg.ts === ts
          ) {
            continue;
          }


          const isBot =
            Boolean(msg.bot_id);


          /*
           * Remove Slack @mentions from historical messages.
           */

          const msgText =
            (msg.text || "")
              .replace(
                /<@[A-Z0-9]+>/g,
                ""
              )
              .trim();


          if (!msgText) {
            continue;
          }


          history.push({
            role:
              isBot
                ? "assistant"
                : "user",

            content:
              msgText,
          });
        }
      }


      /* =====================================================
         ASK AI EMPLOYEE
      ===================================================== */

      const result =
        await askAiEmployee(
          persona,
          history,
          cleanText,
          {
            slackChannel:
              channel,

            slackThreadTs:
              replyTargetTs,

            requestingUserId:
              user,
          }
        );


      /* =====================================================
         HUMAN-STYLE RESPONSE
      ===================================================== */

      const reply =
        formatEmployeeReply(
          persona,
          result.text,
          result.pendingApprovals.length,
        );


      await say({
        channel,

        thread_ts:
          replyTargetTs,

        text:
          reply,
      });


      /* =====================================================
         SUCCESS REACTIONS
      ===================================================== */

      await client.reactions.remove({
        channel,
        timestamp: ts,
        name: "eyes",
      }).catch(() => {});


      await client.reactions.add({
        channel,
        timestamp: ts,
        name: "white_check_mark",
      }).catch(() => {});


    } catch (error) {

      /* =====================================================
         ERROR HANDLING
      ===================================================== */

      console.error(
        "Pipeline failure:",
        error
      );


      await client.reactions.remove({
        channel,
        timestamp: ts,
        name: "eyes",
      }).catch(() => {});


      await client.reactions.add({
        channel,
        timestamp: ts,
        name: "x",
      }).catch(() => {});


      /*
       * IMPORTANT:
       *
       * Do NOT reference `result` here.
       * `result` does not exist if askAiEmployee()
       * throws an error.
       */

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while processing your request.";


      await say({

        channel,

        thread_ts:
          replyTargetTs,

        text:
          `${persona.avatarEmoji} *${persona.name}*\n\n` +
          `Sorry, I ran into a problem while working on that.\n\n` +
          `> ${errorMessage}`,
      });
    }
  }
);


/* =========================================================
   START WORKFORCE
========================================================= */

(async () => {

  await app.start();
  
   startWorkforceScheduler(
    app.client
  );

  console.log(
    "⚡ AI Workforce is online."
  );

  console.log(
    "👥 10 AI employees loaded."
  );

})();
