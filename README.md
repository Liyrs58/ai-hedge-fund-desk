# AHF · Desk 04

Paper trading desk. Eleven seats mark a name on a shared blackboard, debate, and open a ticket. Risk has a real veto. Nothing here is live capital, and nothing here is advice.

The desk follows [TradingAgents](https://github.com/TauricResearch/TradingAgents) (Xiao, Su, Deng, et al., arXiv [2412.20138](https://arxiv.org/abs/2412.20138)): fundamental / news / sentiment / technical analysts, bull and bear researchers (multi-round), a trader, a three-seat risk committee (aggressive / conservative / neutral), and a risk judge who applies portfolio limits. This repo is a TypeScript paper desk of that conversation, not a port of the Python research stack.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

The click-through is **client-side paper only**. No OpenAI/Anthropic/Gemini/Grok call, and no `/api` fetch, is required to run a name, veto, or approve.

```bash
npm run build   # must pass
```

## Keys

| Env | Required? | What it does |
| --- | --- | --- |
| *(none)* | Default | Deterministic mock pipeline. Desk runs offline. |
| `LLM_PROVIDER=mock` | Optional | Force the mock even if other keys are set. |
| `LLM_PROVIDER=openai` + `OPENAI_API_KEY` | Optional | Rewrite debate bodies via OpenAI. |
| `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` | Optional | Same, Anthropic. |
| `LLM_PROVIDER=gemini` + `GOOGLE_API_KEY` or `GEMINI_API_KEY` | Optional | Same, Gemini. |
| `LLM_PROVIDER=grok` + `XAI_API_KEY` | Optional | Same, xAI. |

Copy `.env.example` to `.env.local` to set a live provider. Optional `*_MODEL` overrides are in that file. A live call that fails falls back to mock prose; the footer reads `FALLBACK MOCK`. Risk numbers and fills are never taken from the model.

There is no broker, no order router, and no market-data vendor. Book and blotter persist in `localStorage`.

## What is real vs mocked

**Real (computed on every run, from the current book + quote snapshot + paper news wire):**

- Blackboard pipeline. Each seat is a function that reads prior notes (stance, score, claims, `cited` ids) and appends its own. Analysts run first. Bull/bear run two rounds; round two must answer the opponent. Hale’s ticket is derived from analyst scores **and** the research average, plus existing exposure — not a per-ticker canned script. Run the same name after a fill and the debate changes.
- Risk committee then judge. Aggressive / conservative / neutral vote a size. Sato takes the median and simulates the next book against hard limits: gross 80%, single-name 25%, sector 40%, short 15%, daily VaR $40k, drawdown 8% of peak NAV. Breach → trim in 0.5% steps, or veto if the name cannot fit. IV and beta can haircut size (trim) with a WARNING; they do not invent a veto.
- Paper execution. Approve prices the ticket with slippage (`2bp + participation×4000 + IV×0.15`) and `1bp` fees. Cash moves at **fill px**, not the mark. Average cost uses the fill. Blotter stores the fill, slip, fee, and cash delta.

**Mocked / stubbed:**

- Quotes are sample closes as-of 18 Sep 2026 (`NVDA` `AAPL` `MSFT` `TSLA` `JPM` `XOM`), not a live vendor.
- The news wire is a deterministic paper file (`src/lib/desk/news.ts`), not a news API. Filings/technicals are derived from the quote snapshot (PE, FCF, RSI, MACD, IV, volume).
- Debate *wording* is rendered from structured claims when no LLM key is set. A live LLM may rewrite wording only.
- Fills never hit an exchange. P&L is mark-to-book on the sample closes.

## Desk

| Seat | Agent | Mandate |
| --- | --- | --- |
| 04-A | M. Chen · FND | Filings, NTM, cash. No tape. |
| 04-B | E. Walsh · NWS | Headlines, filings, event risk. |
| 04-C | A. Okonkwo · SEN | Skew, flow, polarity. 10-day horizon. |
| 04-D | L. Varga · TEC | Levels, RSI, MACD. Stops only. |
| 04-E | R. Patel · BUL | Long case. Must answer the bear. |
| 04-F | S. Novak · BER | Short case. Must answer the bull. |
| 04-G | J. Hale · TRD | One proposal per name. |
| 04-H | D. Okada · AGR | Aggressive risk. Push size. |
| 04-I | H. Berg · CSV | Conservative risk. Cut size. |
| 04-J | P. Iyer · NEU | Neutral risk. Median the committee. |
| 04-K | K. Sato · RSK | Hard limits. Veto, trim, last word. |

Watch is a name picker in the masthead strip. Tape is the center column. The risk ticket on the right carries Sato’s checks, fill economics after Approve, the blotter, and the PM’s **Veto / Approve** stamp. On a narrow screen the three panes become Desk / Transcript / Ticket tabs. **View → Tabs** forces that layout on desktop.

Seed book is long AAPL / MSFT / JPM. Typical mock outcomes on that seed (still computed — a different book can change them):

- `NVDA` — BUY, often trimmed on IV, fillable.
- `AAPL` — HOLD (already a large name).
- `MSFT` — HOLD (in book and extended vs 50d).
- `TSLA` — SELL with IV/beta warnings; PM can still veto.
- `JPM` — BUY add, usually inside limits.
- `XOM` — HOLD (new energy sleeve on a dead tape).

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
| **Reset book** | Strip | Restores the seed book (AAPL/MSFT/JPM) and seed blotter; clears the tape. |
| **Agent row** (Fundamental … Risk Judge) | Left roster / Desk tab | Click filters the transcript to that seat (`FILTER`). Click again to clear. |
| **Veto · Block trade** | Ticket, after Hale proposes | Status → **VETOED**. Book unchanged. Buttons disable. |
| **Approve · Release to market** | Ticket, after Hale proposes | Status → **FILLED**. Working BUY/SELL hits the book at fill px (slip + fee). HOLD is mark-only. |

Suggested click-through (zero keys):

1. Confirm seed **Book** shows AAPL, MSFT, JPM.
2. Leave NAME on `NVDA`, set **PACE → Instant**, click **Run desk**.
3. Tape has eleven seats. Ticket is PENDING BUY. Sato may trim. Click **Approve**. Book gains NVDA at fill px, not the round mark. Blotter shows FILLED with slip/fee.
4. Click **Reset book**. NVDA is gone.
5. NAME `TSLA`, **Run desk**, **Veto**. Status VETOED. Book still seed only.
6. Click **VIEW → Tabs**, then **Desk**, **Transcript**, **Ticket**. All three open.
7. On Desk tab, click **Sentiment Analyst**. Transcript dims other seats.

## Citations

- Xiao, Y., Su, Y., Deng, Y., et al. (2024). *TradingAgents: Multi-Agents LLM Financial Trading Framework*. arXiv:2412.20138. https://arxiv.org/abs/2412.20138
- Tauric Research. *TradingAgents*. https://github.com/TauricResearch/TradingAgents

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui primitives. Cream paper `#F4F0E6`, ink, copper. Newsreader + IBM Plex Sans + IBM Plex Mono. No assemble-lockfile CI; `package-lock.json` is a normal `npm install` lockfile.
