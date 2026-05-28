import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createMCPClient } from "@ai-sdk/mcp";
import { openai } from "@ai-sdk/openai";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import * as readline from "node:readline/promises";

const cdataAcctEmail = process.env.CDATA_ACCT_EMAIL;
const cdataPat = process.env.CDATA_PAT;
const cdataMcpUrl = process.env.CDATA_MCP_URL ?? "https://mcp.cloud.cdata.com/mcp";

if (!cdataAcctEmail || !cdataPat) {
  throw new Error("CDATA_ACCT_EMAIL and CDATA_PAT must be set in .env");
}

function pickModel() {
  if (process.env.ANTHROPIC_API_KEY) return anthropic("claude-opus-4-7");
  if (process.env.OPENAI_API_KEY) return openai("gpt-5");
  if (process.env.GEMINI_API_KEY) return google("gemini-2.5-flash");
  throw new Error(
    "Set one of ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in .env",
  );
}

const cdataCredentials = Buffer.from(
  `${cdataAcctEmail}:${cdataPat}`,
  "utf-8",
).toString("base64");
const cdataHeaders = { Authorization: `Basic ${cdataCredentials}` };

const queryClient = await createMCPClient({
  transport: { type: "http", url: cdataMcpUrl, headers: cdataHeaders },
});
const mgmtClient = await createMCPClient({
  transport: { type: "http", url: `${cdataMcpUrl}/mgmt`, headers: cdataHeaders },
});

const tools = {
  ...(await queryClient.tools()),
  ...(await mgmtClient.tools()),
};

const SYSTEM_PROMPT = `You are the daily standup agent for ${cdataAcctEmail}.

Generate a concise daily standup summary by querying the user's data through the MCP tools.
Pull from:
- Jira — in-progress tickets assigned to ${cdataAcctEmail}
- Slack — recent activity in their active channels
- Google Calendar — today's events

CData connectors expose each source as a SQL-queryable system. Use the MCP tools to list
catalogs and tables, then run queries. The management tools expose account- and
connection-level introspection if you need to discover which connectors are wired.

## Required preflight — run before generating the standup

On every run, you MUST verify all three required connectors exist on the user's account
before producing any output:

1. Use the management tools to list the user's existing connections.
2. For each of {Jira, Slack, Google Calendar} that is NOT already configured:
   a. Call the management tool to create a new connection of that type immediately.
   b. Drive the OAuth flow: invoke the auth/connect procedure and share the resulting
      authorization URL with the user in the chat. Tell them to open it, authorize,
      and reply once done.
   c. Wait for the user to confirm completion, then verify the connection is active
      (list connections again and confirm status).
3. Only after all three connectors are present and active (or the user has explicitly
   said "skip <connector>" for one), proceed to generate the standup.

Hard rules for the preflight:
- DO NOT ask "would you like me to set up X?" — just create it and present the OAuth URL.
- DO NOT generate the standup first and surface missing connectors at the end.
- DO NOT defer connection setup to "a follow-up" — the entire preflight runs in this turn.
- If a creation/auth tool call fails, report the exact error and stop; don't substitute
  with a partial standup.

## Standup output format

Once preflight passes, format the output in markdown with these sections:
- **Yesterday** — completed work
- **Today** — in-progress tickets and today's calendar
- **Blockers** — anything stuck or waiting`;

const model = pickModel();
const messages: ModelMessage[] = [];
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function turn(userInput: string) {
  messages.push({ role: "user", content: userInput });
  const result = await generateText({
    model,
    tools,
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(25),
  });
  messages.push(...result.response.messages);
  if (result.text) console.log(`\n${result.text}\n`);
}

try {
  await turn("Generate my daily standup for today.");
  while (true) {
    const line = (await rl.question("> ")).trim();
    if (!line) continue;
    if (line === "exit" || line === "quit") break;
    await turn(line);
  }
} finally {
  rl.close();
  await queryClient.close();
  await mgmtClient.close();
}
