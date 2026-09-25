import { WebClient } from "@slack/web-api";

import { env } from "../config/env.js";

export const slackClient = new WebClient(
  env.slack.botToken,
);

function normalizeSlackChannel(
  value: string,
): string {
  const input = value.trim();

  /*
   * Slack formatted channel:
   * <#C1234567890>
   * <#C1234567890|example>
   */
  const slackChannelMatch =
    input.match(
      /^<#([A-Z0-9]+)(?:\|[^>]+)?>$/i,
    );

  if (slackChannelMatch) {
    return slackChannelMatch[1];
  }

  /*
   * #example
   */
  if (input.startsWith("#")) {
    return input.slice(1).trim();
  }

  return input;
}

/* =========================================================
   SEND SLACK MESSAGE
========================================================= */
export async function sendSlackMessage(params: {
  channel: string;
  text: string;
  threadTs?: string;
}) {
  const channel =
    normalizeSlackChannel(
      params.channel,
    );

  const text =
    params.text.trim();

  if (!channel) {
    throw new Error(
      "Slack channel is required.",
    );
  }

  if (!text) {
    throw new Error(
      "Slack message cannot be empty.",
    );
  }

  const result =
    await slackClient.chat.postMessage({
      channel,
      text,

      ...(params.threadTs
        ? {
            thread_ts:
              params.threadTs,
          }
        : {}),
    });

  return {
    success: true,

    channel:
      result.channel ?? channel,

    timestamp:
      result.ts ?? null,
  };
}

/* =========================================================
   FIND SLACK CHANNEL
========================================================= */

export async function findSlackChannel(
  channelInput: string,
) {
  const input = channelInput.trim();

  if (!input) {
    throw new Error("Slack channel name is required.");
  }

  const formattedMatch = input.match(
    /^<#([A-Z0-9]+)(?:\|[^>]+)?>$/i,
  );

  if (formattedMatch) {
    const channelId = formattedMatch[1];
    return {
      success: true,
      channelId,
      name: channelId,
    };
  }

  const directId = input.match(
    /^([CGD][A-Z0-9]+)$/i,
  );

  if (directId) {
    return {
      success: true,
      channelId: directId[1],
      name: directId[1],
    };
  }

  const normalizedInput = input
    .replace(/^#/, "")
    .trim()
    .toLowerCase();

  let cursor: string | undefined;

  do {
    const result = await slackClient.conversations.list({
      limit: 200,
      exclude_archived: true,
      types: "public_channel,private_channel",
      ...(cursor ? { cursor } : {}),
    });

    const channels = Array.isArray(result.channels)
      ? result.channels
      : [];

    const match = channels.find(
      (channel) =>
        channel.name?.toLowerCase() === normalizedInput,
    );

    if (match?.id) {
      return {
        success: true,
        channelId: match.id,
        name: match.name ?? normalizedInput,
        isPrivate: Boolean(match.is_private),
      };
    }

    cursor =
      result.response_metadata?.next_cursor ||
      undefined;
  } while (cursor);

  throw new Error(
    `Slack channel "#${normalizedInput}" could not be found. ` +
      `Make sure the channel exists and the Marcus Slack app has access to it.`,
  );
}

/* =========================================================
   UPLOAD MARKDOWN TO SLACK
========================================================= */

export async function uploadMarkdownToSlack(
  client: WebClient,
  params: {
    channel: string;
    threadTs?: string;
    filename: string;
    content: string;
  },
) {
  const result =
    await client.files.uploadV2({
      channel_id: params.channel,
      thread_ts: params.threadTs,
      filename: params.filename,
      title: params.filename.replace(
        /\.md$/i,
        "",
      ),
      content: params.content,
    });

  const files =
    Array.isArray(result.files)
      ? result.files
      : [];

  return {
    success: true,
    file: files[0] ?? null,
    filename: params.filename,
  };
}


/* =========================================================
   READ SLACK THREAD
========================================================= */

export async function readSlackThread(
  channel: string,
  threadTs: string,
) {
  const result =
    await slackClient.conversations.replies({
      channel,
      ts: threadTs,
      limit: 50,
    });

  return {
    success: true,
    messages:
      result.messages?.map((message) => ({
        user: message.user,
        text: message.text,
        timestamp: message.ts,
        bot: Boolean(message.bot_id),
      })) ?? [],
  };
}