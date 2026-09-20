# AHF · Desk 04

Paper trading desk. Five agents mark a name, debate on the tape, and open a ticket. Risk has veto. Nothing here is live capital, and nothing here is advice.

The shape of the desk is borrowed from [TradingAgents](https://github.com/TauricResearch/TradingAgents) (arXiv [2412.20138](https://arxiv.org/abs/2412.20138)): fundamental, sentiment, and technical analysts, a trader who proposes, and a risk manager who can trim or kill the idea. This repo is a focused demo of that conversation, not a clone of the Python research stack.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

The click-through is **client-side paper only**. No OpenAI/Anthropic/Gemini/Grok call, and no `/api` fetch, is required to run a name, veto, or approve.

## Paper vs live keys

**Paper (default).** No API keys. The desk runs a deterministic client-side script for `NVDA`, `AAPL`, `MSFT`, `TSLA`, `JPM`, `XOM`. Marks are sample closes as-of 18 Sep 2026. The tape still plays in order: analysts → rebuttals → Hale’s proposal → Sato’s mark. Optional `/api/desk/run` returns the same script if you hit it with no keys.

**Live LLM (optional).** Copy `.env.example` to `.env.local` and set a provider:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

Supported providers: `openai`, `anthropic`, `gemini`, `grok`. If the live call fails, the desk falls back to the paper script and the header shows `FALLBACK MOCK`. Leave `LLM_PROVIDER=mock` (or unset every key) for the demo.

There is no broker, no order router, and no market data vendor in this app. Book fills stay in `localStorage`.

## Desk

| Seat | Agent | Mandate |
| --- | --- | --- |
| 04-A | M. Chen · FND | Filings, NTM, cash. No tape. |
| 04-B | A. Okonkwo · SEN | News, skew, flow. 10-day horizon. |
| 04-C | L. Varga · TEC | Levels, RSI, MACD. Stops only. |
| 04-D | J. Hale · TRD | One proposal per name. |
| 04-E | K. Sato · RSK | Veto, trim, limits. Last word. |

Watch is a name picker in the masthead strip. Tape is the center column. The risk ticket on the right carries Sato’s checks and the PM’s **Veto / Approve** stamp. On a narrow screen the three panes become Desk / Transcript / Ticket tabs. **View → Tabs** forces that layout on desktop.

## QA checklist

Every control below must work with `npm run dev` and no `.env` keys.

| Control | Where | Expected |
| --- | --- | --- |
| **NAME** chips (`NVDA` `AAPL` `MSFT` `TSLA` `JPM` `XOM`) | Strip under DESK | Selects the name. Mark in the masthead updates. Switching names clears the tape. |
| **PACE → Stream** | Strip | Debate plays one mark at a time. First mark is on the tape as soon as you click **Run desk**. |
| **PACE → Instant** | Strip | Next **Run desk** dumps the full tape at once. Mid-run, remaining marks flush. |
| **VIEW → Floor** | Strip | Three panes on a wide screen (roster \| transcript \| ticket). |
| **VIEW → Tabs** | Strip | **Desk / Transcript / Ticket** tabs. Each tab shows its pane. |
| **Desk / Transcript / Ticket** tabs | Tabs view, or any narrow screen | Clicking a tab switches the pane. Ticket tab still has Veto/Approve. |
| **Run desk** | Strip, right | Starts the mock debate for the selected name. No network. Click again to re-run. |
| **Skip to mark** | Strip, appears while streaming | Jumps to the final mark and opens the ticket. |
| **Reset book** | Strip | Restores the seed book (AAPL/MSFT/JPM) and clears the tape. |
| **Agent row** (Fundamental … Risk) | Left roster / Desk tab | Click filters the transcript to that seat (`FILTER`). Click again to clear. |
| **Veto · Block trade** | Ticket, after Hale proposes | Status → **VETOED**. Book unchanged. Buttons disable. |
| **Approve · Release to market** | Ticket, after Hale proposes | Status → **FILLED**. For `NVDA`/`JPM` the name appears or size rises in **Book**. `AAPL`/`MSFT`/`TSLA`/`XOM` may be HOLD — mark only, no fill. |

Suggested click-through (zero keys):

1. Confirm seed **Book** shows AAPL, MSFT, JPM.
2. Leave NAME on `NVDA`, set **PACE → Instant**, click **Run desk**.
3. Ticket is PENDING. Click **Approve**. Book gains NVDA. Status FILLED.
4. Click **Reset book**. NVDA is gone.
5. NAME `TSLA`, **Run desk**, **Veto**. Status VETOED. Book still seed only.
6. Click **VIEW → Tabs**, then **Desk**, **Transcript**, **Ticket**. All three open.
7. On Desk tab, click **Sentiment Analyst**. Transcript dims other seats.

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui primitives. Cream paper `#F4F0E6`, ink, copper. Newsreader + IBM Plex Sans + IBM Plex Mono.
