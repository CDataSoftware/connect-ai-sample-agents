# Daily Standup Agent — LangChain (Python)

Auto-generates a daily standup summary from your Jira, Slack, and Google Calendar via the
[CData Query MCP](https://www.cdata.com/connect-cloud/) — built on LangChain v1.

## Prerequisites

- Python **3.10 to 3.14** (3.12 or 3.13 recommended). Python 3.15 isn't supported yet:
  `zstandard`, which `langsmith` depends on, has no 3.15 wheels.
- On Intel Macs, `cryptography` builds from source and needs a
  [Rust toolchain](https://rustup.rs/): it no longer ships Intel Mac wheels.
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

## Updating dependencies

`requirements.txt` is a lockfile: it pins every package the agent installs, direct and
transitive, with hashes, so each install gets the versions this template was tested with.
The direct dependencies live in `requirements.in`. Don't edit `requirements.txt` by hand —
pip rejects entries without hashes. To add, remove, or upgrade a dependency, edit
`requirements.in` and regenerate the lock with [uv](https://docs.astral.sh/uv/):

```bash
uv pip compile requirements.in --universal --python-version 3.10 --generate-hashes \
  --exclude-newer 2026-10-22T00:00:00Z \
  -o requirements.txt
```

`--universal` keeps one lock valid on Windows, macOS, and Linux, `--python-version 3.10`
resolves for the oldest supported Python, and `--exclude-newer` skips releases less than a
week old: set it to a date a week ago. Then run `pip install -r requirements.txt` again.

## Customizing

- **Model** — edit `pick_model()` in `agent.py` to change provider order or model IDs
  (defaults: `claude-opus-4-7`, `gpt-5`, `gemini-pro-latest`).
- **System prompt** — edit `SYSTEM_PROMPT` in `agent.py` to adjust tone, sections, or
  which connectors are required during preflight.
- **MCP endpoint** — override `CDATA_MCP_URL` in `.env` to point at a toolkit MCP server,
  but note that the management server must still use the standard base URL.
