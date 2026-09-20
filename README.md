# AHF · Desk 04

Eleven-seat **paper** trading desk. Analysts mark a name on a shared blackboard, bull and bear argue, a trader proposes, a three-seat risk committee votes, and a judge applies hard book limits. You still stamp **Approve** or **Veto**. Nothing here is live capital. Nothing here is advice.

**Best use case:** a TradingAgents teaching tool and multi-agent paper-trading research desk — walk a debate → ticket → risk veto/trim → paper fill without brokers, vendors, or API keys.

It follows [TradingAgents](https://github.com/TauricResearch/TradingAgents) (Xiao, Su, Deng, et al., arXiv [2412.20138](https://arxiv.org/abs/2412.20138)): fundamental / news / sentiment / technical, two-round bull/bear, trader, aggressive / conservative / neutral risk, then a judge. This repo is a TypeScript paper desk of that conversation, not a port of the Python research stack.

## Run (zero keys)

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

No `.env` file is required. The click-through is **client-side paper**: mock LLM, sample marks, local book/blotter. Run a name, veto, or approve without a network call.

```bash
npm run build    # production compile — must pass
npm run paper    # offline debate → risk → fill smoke (NVDA buy + fill, TSLA short)
```

Suggested path on the seed book (AAPL / MSFT / JPM long):

1. NAME `NVDA`, **PACE → Instant**, **Run desk**.
2. Eleven seats on the tape. Ticket is a BUY (Sato may trim). **Approve**. Book gains NVDA at fill px (slip + 1bp fee), not the round mark.
3. **Reset book**. NAME `TSLA`, **Run desk**, **Veto**. Status VETOED. Book still seed only.

## Deploy on Vercel

The app is a standard Next.js App Router project. **No environment variables are required** for the public demo.

1. Fork or push this repo to GitHub.
2. [Import the project](https://vercel.com/new) on Vercel. Framework preset: **Next.js**.
3. Leave env empty. Deploy.

CLI equivalent from a clone:

```bash
npx vercel
```

Production build command is `npm run build`. `package-lock.json` is a normal `npm install` lockfile. There is **no** GitHub Action that assembles or patches the lockfile.

Optional LLM keys (see below) can be added later in the Vercel project **Settings → Environment Variables**. They only rewrite debate wording.

## Optional: live marks

**Refresh marks** (strip, next to Reset book) asks Yahoo Finance for last / change / volume / spark on the six names. No Yahoo key.

- Success: header marks update; the next **Run desk** uses those last prices. Footer reads `DATA: YAHOO+PAPER`. PE, RSI, MACD, IV, beta stay paper so the teaching path stays deterministic.
- Failure (blocked network, timeout, empty payload): sample marks stay on the tape. Footer explains. Offline **Run desk** is unchanged — the button is the only Yahoo call.
- **Reset book** restores sample marks as well as the seed book.

## Optional: LLM rewrite

Copy `.env.example` to `.env.local` only if you want live prose.

| Env | Required? | What it does |
| --- | --- | --- |
| *(none)* | Default | Deterministic mock pipeline. Desk runs offline. |
| `LLM_PROVIDER=mock` | Optional | Force the mock even if other keys are set. |
| `LLM_PROVIDER=openai` + `OPENAI_API_KEY` | Optional | Rewrite debate bodies via OpenAI. |
| `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` | Optional | Same, Anthropic. |
| `LLM_PROVIDER=gemini` + `GOOGLE_API_KEY` or `GEMINI_API_KEY` | Optional | Same, Gemini. |
| `LLM_PROVIDER=grok` + `XAI_API_KEY` | Optional | Same, xAI. |

A live call that fails falls back to mock prose; the footer reads `FALLBACK MOCK`. Ticket size, risk verdict, and fills are never taken from the model.

There is no broker, no order router, and no paid market-data vendor. Book and blotter persist in `localStorage`.

## What is real vs stubbed

**Real (computed on every run from the current book + quote snapshot + paper news wire):**

- Blackboard pipeline. Each seat is a function that reads prior notes (stance, score, claims, `cited` ids) and appends its own. Analysts first. Bull/bear two rounds; round two must answer the opponent. Hale’s ticket is derived from analyst scores **and** the research average, plus existing exposure — not a per-ticker canned script. Run the same name after a fill and the debate changes.
- Risk committee then judge. Aggressive / conservative / neutral vote a size. Sato takes the median and simulates the next book against hard limits: gross 80%, single-name 25%, sector 40%, short 15%, daily VaR $40k, drawdown 8% of peak NAV. Breach → trim in 0.5% steps, or veto if the name cannot fit. IV and beta can haircut size (trim) with a WARNING; they do not invent a veto.
- Paper execution. Approve prices the ticket with slippage (`2bp + participation×4000 + IV×0.15`) and `1bp` fees. Cash moves at **fill px**, not the mark. Average cost uses the fill. Blotter stores the fill, slip, fee, and cash delta.

**Stubbed:**

- Default quotes are sample closes as-of 18 Sep 2026 (`NVDA` `AAPL` `MSFT` `TSLA` `JPM` `XOM`). **Refresh marks** may overlay Yahoo last/change/volume; fundamentals and vol stay paper.
- The news wire is a deterministic paper file (`src/lib/desk/news.ts`), not a news API.
- Debate *wording* is rendered from structured claims when no LLM key is set. A live LLM may rewrite wording only.
- Fills never hit an exchange. P&L is mark-to-book on the marks on the tape.

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

Typical mock outcomes on the seed book (still computed — a different book or a Yahoo last can change them):

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
| **NAME** chips | Strip under DESK | Selects the name. Mark in the masthead updates. Switching names clears the tape. |
| **PACE → Stream / Instant** | Strip | Stream plays one mark at a time. Instant dumps the full tape. |
| **VIEW → Floor / Tabs** | Strip | Three panes, or Desk / Transcript / Ticket tabs. |
| **Run desk** | Strip | Starts the mock debate. No network. Click again to re-run. |
| **Refresh marks** | Strip | Optional Yahoo last. On failure, sample marks stay. Does not run the desk. |
| **Reset book** | Strip | Seed book + sample marks + seed blotter; clears the tape. |
| **Veto / Approve** | Ticket | Veto leaves the book. Approve fills at slip+fee. |

## Citations

- Xiao, Y., Su, Y., Deng, Y., et al. (2024). *TradingAgents: Multi-Agents LLM Financial Trading Framework*. arXiv:2412.20138. https://arxiv.org/abs/2412.20138
- Tauric Research. *TradingAgents*. https://github.com/TauricResearch/TradingAgents

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui primitives. Cream paper `#F4F0E6`, ink, copper. Newsreader + IBM Plex Sans + IBM Plex Mono.
