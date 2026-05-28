"""Daily standup LangChain agent — runs on Anthropic, OpenAI, or Gemini,
pulls Jira / Slack / Calendar via the CData Query MCP."""

import asyncio
import base64
import os

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_openai import ChatOpenAI

load_dotenv()


CDATA_ACCT_EMAIL = os.getenv("CDATA_ACCT_EMAIL")
CDATA_PAT = os.getenv("CDATA_PAT")
CDATA_MCP_URL = os.getenv("CDATA_MCP_URL", "https://mcp.cloud.cdata.com/mcp")

if not CDATA_ACCT_EMAIL or not CDATA_PAT:
    raise RuntimeError("CDATA_ACCT_EMAIL and CDATA_PAT must be set in the environment.")


def pick_model():
    if os.getenv("ANTHROPIC_API_KEY"):
        return ChatAnthropic(model="claude-opus-4-7")
    if os.getenv("OPENAI_API_KEY"):
        return ChatOpenAI(model="gpt-5")
    if os.getenv("GEMINI_API_KEY"):
        return ChatGoogleGenerativeAI(model="gemini-pro-latest")
    raise RuntimeError(
        "Set one of ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY."
    )


_basic_token = base64.b64encode(f"{CDATA_ACCT_EMAIL}:{CDATA_PAT}".encode()).decode()
_cdata_headers = {
    "Authorization": f"Basic {_basic_token}",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
}


SYSTEM_PROMPT = f"""You are the daily standup agent for {CDATA_ACCT_EMAIL}.

Generate a concise daily standup summary by querying the user's data through the MCP tools.
Pull from:
- Jira — in-progress tickets assigned to {CDATA_ACCT_EMAIL}
- Slack — recent activity in their active channels
- Google Calendar — today's events

CData connectors expose each source as a SQL-queryable system. Use the MCP tools to list
catalogs and tables, then run queries. The management tools expose account- and
connection-level introspection if you need to discover which connectors are wired.

## Required preflight — run before generating the standup

On every run, you MUST verify all three required connectors exist on the user's account
before producing any output:

1. Use the management tools to list the user's existing connections.
2. For each of {{Jira, Slack, Google Calendar}} that is NOT already configured:
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
- **Blockers** — anything stuck or waiting"""


async def main() -> None:
    client = MultiServerMCPClient(
        {
            "cdataQuery": {
                "transport": "streamable_http",
                "url": CDATA_MCP_URL,
                "headers": _cdata_headers,
            },
            "cdataMgmt": {
                "transport": "streamable_http",
                "url": f"{CDATA_MCP_URL}/mgmt",
                "headers": _cdata_headers,
            },
        }
    )
    tools = await client.get_tools()
    agent = create_agent(model=pick_model(), tools=tools)

    messages: list = [{"role": "system", "content": SYSTEM_PROMPT}]

    async def turn(user_input: str) -> None:
        messages.append({"role": "user", "content": user_input})
        result = await agent.ainvoke({"messages": messages})
        messages.clear()
        messages.extend(result["messages"])
        final = messages[-1]
        text = final.content if isinstance(final.content, str) else str(final.content)
        if text:
            print(f"\n{text}\n")

    await turn("Generate my daily standup for today.")
    while True:
        try:
            line = (await asyncio.to_thread(input, "> ")).strip()
        except EOFError:
            break
        if not line:
            continue
        if line.lower() in ("exit", "quit"):
            break
        await turn(line)


if __name__ == "__main__":
    asyncio.run(main())
