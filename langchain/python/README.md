# Daily Standup Agent — LangChain (Python)

Auto-generates a daily standup summary from your Jira, Slack, and Google Calendar via the
[CData Query MCP](https://www.cdata.com/connect-cloud/) — built on LangChain v1.

## Prerequisites

- Python **3.10+** (3.12 or 3.13 recommended).
- A CData Connect Cloud account with a Personal Access Token (PAT).
- One LLM provider key: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`.

## Setup

From this directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
# Fill in CDATA_ACCT_EMAIL, CDATA_PAT, and one of ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
```

## Run

```bash
python agent.py
```

`agent.py` calls `dotenv.load_dotenv()` on startup, so the `.env` file in this directory
is picked up automatically.

The agent kicks off with *"Generate my daily standup for today."* automatically, then
drops to a `>` prompt where you can continue the conversation.

## Run flow

1. **Preflight** — on the first turn, the agent checks that Jira, Slack, and Google
   Calendar connections exist on your CData account. If any are missing, it creates them
   and prints an OAuth URL right in the terminal. Open the URL, authorize, then type
   *"done"* (or any confirmation) at the `>` prompt and the agent verifies and continues.
2. **Query** — pulls in-progress Jira tickets, recent Slack activity, and today's Calendar
   events through the Query MCP.
3. **Summarize** — prints a markdown standup with **Yesterday**, **Today**, and
   **Blockers** sections.

Type `exit` or `quit` (or `Ctrl-D`) to close the session.

## What it does

`agent.py` uses `MultiServerMCPClient` (from `langchain-mcp-adapters`) to connect to two
CData MCP endpoints (`/mcp` and `/mcp/mgmt`), then builds an agent with `create_agent` from
`langchain`. A persistent `messages` array threads conversation history (system prompt +
user turns + tool calls + assistant replies) into each `agent.ainvoke` call, so the model
can pause for OAuth confirmation and resume without losing context.

The model is selected from the first provider key found, in order: Anthropic → OpenAI →
Gemini.

## Customizing

- **Model** — edit `pick_model()` in `agent.py` to change provider order or model IDs
  (defaults: `claude-opus-4-7`, `gpt-5`, `gemini-pro-latest`).
- **System prompt** — edit `SYSTEM_PROMPT` in `agent.py` to adjust tone, sections, or
  which connectors are required during preflight.
- **MCP endpoint** — override `CDATA_MCP_URL` in `.env` to point at a toolkit MCP server,
  but note that the management server must still use the standard base URL.
