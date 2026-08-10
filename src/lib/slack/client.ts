import axios from "axios";

export async function postSlackMessage(text: string, channel?: string) {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.info("[slack:demo]", { channel, text });
    return { ok: true, demo: true as const };
  }

  const res = await axios.post(
    "https://slack.com/api/chat.postMessage",
    {
      channel: channel || process.env.SLACK_DEFAULT_CHANNEL || "#hiring",
      text,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  return { ok: Boolean(res.data.ok), demo: false as const, data: res.data };
}
