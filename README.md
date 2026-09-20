# AHF · Desk 04

Eleven-seat **paper** trading desk. Analysts mark a name on a shared blackboard, bull and bear argue, a trader proposes, a three-seat risk committee votes, and a judge applies hard book limits. You still stamp **Approve** or **Veto**. Nothing here is live capital. Nothing here is advice.

**Best use case:** a TradingAgents teaching tool and multi-agent paper-trading **research-real** desk — walk a debate → ticket → risk veto/trim → paper fill. Yahoo last prices when the network answers; a JSON book that survives reload; mock LLM with zero keys, or NVIDIA NIM `google/gemma-4-31b-it` when `NVIDIA_API_KEY` is set.

It follows [TradingAgents](https://github.com/TauricResearch/TradingAgents) (Xiao, Su, Deng, et al., arXiv [2412.20138](https://arxiv.org/abs/2412.20138)): fundamental / news / sentiment / technical, two-round bull/bear, trader, aggressive / conservative / neutral risk, then a judge. This repo is a TypeScript paper desk of that conversation, not a port of the Python research stack.

## Run (zero keys)

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

No `.env` file is required. Copy `.env.example` to `.env.local` only if you want NVIDIA prose.

- LLM badge **MOCK** without `NVIDIA_API_KEY`.
- Marks: Yahoo last on load and **Refresh marks**; **SAMPLE** if Yahoo is blocked.
- Book/blotter: JSON file `data/desk-store.json` (write-through `localStorage` cache). On serverless hosts that cannot write `data/`, the store falls back to `/tmp/ahf-desk-store.json` (ephemeral, `store.durable: false`). Set `DESK_STORE=blob` plus a Blob token for durable Vercel storage.
- `LIVE_TRADING` is always **false**. `PAPER_BROKER` defaults to **off** (local paper fill simulator). `PAPER_BROKER=alpaca` submits paper orders when keys are present; without keys the badge is **missing-keys** and fills stay on the local simulator. Live Alpaca URLs are refused.

```bash
npm run build    # production compile — must pass
npm run paper    # offline debate → risk → fill smoke (NVDA buy + fill, TSLA short)
```

Suggested path on the seed book (AAPL / MSFT / JPM long):

1. NAME `NVDA`, **PACE → Instant**, **Run desk**.
2. Eleven seats on the tape. Ticket is a BUY (Sato may trim). **Approve**. Book gains NVDA at fill px (slip + 1bp fee), not the round mark.
3. Reload: the fill is still on the book (JSON store).
4. **Reset book**. NAME `TSLA`, **Run desk**, **Veto**. Status VETOED. Book still seed only.

## Deploy on Vercel

The app is a standard Next.js App Router project. **No environment variables are required** for the public demo.

1. Fork or push this repo to GitHub.
2. [Import the project](https://vercel.com/new) on Vercel. Framework preset: **Next.js**.
3. Leave env empty, or set the optional free-tier vars below. Deploy.

CLI equivalent from a clone:

```bash
npx vercel
```

Production build command is `npm run build`. `package-lock.json` is a normal `npm install` lockfile. There is **no** GitHub Action that assembles or patches the lockfile.

### Vercel environment variables

Set these in **Project → Settings → Environment Variables** (Production / Preview / Development as needed). None are required for a MOCK public demo.

| Env | Required? | What to set |
| --- | --- | --- |
| `NVIDIA_API_KEY` | Optional | NIM wording rewrite. |
| `DESK_STORE` | Optional | `blob` to persist the book on Vercel Blob. Unset = JSON file (`data/` locally, `/tmp` on serverless). |
| `BLOB_READ_WRITE_TOKEN` | With blob | Created when you add a Blob store: Storage → Blob → Create → Connect to this project. Free tier. |
| `DEMO_ACCESS_CODE` | Optional | Shared demo code. **Unset = open public demo.** When set, `POST /api/auth/login` with `{ "code": "…" }` sets a signed cookie. |
| `AUTH_SECRET` | With demo gate | `openssl rand -base64 32`. If omitted, the cookie is signed from `DEMO_ACCESS_CODE` (still rotate the code). |
| `PAPER_BROKER` | Optional | `off` (default, local simulator) or `alpaca`. |
| `ALPACA_API_KEY` / `ALPACA_API_SECRET` | With alpaca | Paper keys only. Health badge: `alpaca` with keys, `missing-keys` without (simulator stays on). |
| `ALPACA_BASE_URL` | Optional | Default `https://paper-api.alpaca.markets`. Live hosts (`api.alpaca.markets`) are **refused**. |
| `LIVE_TRADING` | Ignored | Hard-false in code. Setting `true` does nothing. |

After connecting Blob, set `DESK_STORE=blob` and redeploy. `GET /api/health` should then show `"store": { "backend": "blob", "durable": true }`. Without the token, health reports `"backend": "json-file"` and `"durable": false` on Vercel (`/tmp`).

### Optional demo gate

```bash
# Vercel env
DEMO_ACCESS_CODE=your-shared-code
AUTH_SECRET=$(openssl rand -base64 32)
```

Login: `POST /api/auth/login` with `{ "code": "your-shared-code" }`. The desk UI shows an access form when the cookie is missing. Logout: `POST /api/auth/logout`. This is a light shared-code gate, not a full IdP.

On Vercel without Blob, the JSON book lives under `/tmp` (not durable across instances). Local `npm run dev` writes `data/desk-store.json`.

## Marks: LIVE vs SAMPLE

On load, and on **Refresh marks**, the desk asks Yahoo Finance (no key) for last / change / volume / spark on the six names (`query1.finance.yahoo.com/v8/finance/chart`).

- Success: masthead badge **LIVE**. Next **Run desk** uses those last prices. PE, RSI, MACD, IV, beta stay paper.
- Failure (blocked network, timeout, empty payload): badge **SAMPLE**. Sample closes stay on the tape. Offline **Run desk** still works.
- **Reset book** restores the seed book, sample marks, and the SAMPLE badge.

## LLM lock: NVIDIA NIM

Debate *wording* is the only thing a model may rewrite. Ticket size, risk verdict, and fills are always computed in-process.

Hosted NIM is OpenAI-compatible at `https://integrate.api.nvidia.com/v1` ([LLM APIs](https://docs.api.nvidia.com/nim/reference/llm-apis)). Get a key at [build.nvidia.com/settings](https://build.nvidia.com/settings).

| Env | Required? | What it does |
| --- | --- | --- |
| *(none)* | Default | Deterministic mock pipeline. Badge **MOCK**. Desk runs offline. |
| `NVIDIA_API_KEY` | Optional | Rewrite debate wording via NIM. Badge **NVIDIA/google/gemma-4-31b-it**. |
| `NVIDIA_MODEL` | Locked | Always `google/gemma-4-31b-it`. Env is ignored. |
| `NVIDIA_BASE_URL` | Locked | Always `https://integrate.api.nvidia.com/v1`. Env is ignored. |
| `LLM_PROVIDER=mock` | Optional | Force mock even if `NVIDIA_API_KEY` is set. |
| `LIVE_TRADING=false` | Always | Paper fills only. Setting this to true does nothing. |
| `PAPER_BROKER=off` | Default | Local paper fill simulator. No broker call. |
| `PAPER_BROKER=alpaca` | Optional | Submit **paper** orders on Approve when Alpaca keys are set. Live URLs refused. Without keys: `missing-keys`, simulator stays. |
| `ALPACA_API_KEY` / `ALPACA_API_SECRET` | With alpaca | Paper trading keys from the Alpaca dashboard. |
| `ALPACA_BASE_URL` | Optional | Default `https://paper-api.alpaca.markets`. |
| `DESK_STORE=blob` | Optional | Use Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set. Else JSON file. |
| `BLOB_READ_WRITE_TOKEN` | With blob | Auto-set after connecting a Blob store. |
| `DESK_STORE_PATH` | Optional | Override JSON store path (json-file backend). |
| `DEMO_ACCESS_CODE` | Optional | Shared demo gate. Unset = public. |
| `AUTH_SECRET` | With demo gate | Signs the `ahf_demo` cookie. Generate with `openssl rand -base64 32`. |

NIM is called with `stream: true` and a **180s** client timeout (`AbortSignal`). Cold start is about two minutes; non-stream requests can hang. `/api/desk/run` sets `maxDuration = 180`. The browser waits the same 180s. A NIM call that fails or times out falls back to mock prose; the badge reads **FALLBACK MOCK**. `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are ignored — this desk does not call OpenAI or Anthropic.

## Health

`GET /api/health` reports live-trading (always false), paper broker (`off` \| `alpaca` \| `missing-keys`), LLM badge, quote source, store backend/durable, and whether demo auth is required:

```json
{
  "ok": true,
  "liveTrading": false,
  "paperBroker": "off",
  "llm": { "provider": "mock", "model": "google/gemma-4-31b-it", "badge": "MOCK" },
  "quotes": { "source": "yahoo", "badge": "LIVE" },
  "store": { "backend": "json-file", "durable": true },
  "auth": { "required": false }
}
```

With Blob connected and `DESK_STORE=blob`, `store.backend` is `"blob"` and `store.durable` is `true`. With `DEMO_ACCESS_CODE` set, `auth.required` is `true`.

The footer **HEALTH** line mirrors that payload. The masthead broker badge is `off`, `alpaca`, or `missing-keys`.

## What is real vs stubbed

**Real (computed on every run from the current book + quote snapshot + paper news wire):**

- Blackboard pipeline. Each seat is a function that reads prior notes (stance, score, claims, `cited` ids) and appends its own. Analysts first. Bull/bear two rounds; round two must answer the opponent. Hale’s ticket is derived from analyst scores **and** the research average, plus existing exposure — not a per-ticker canned script. Run the same name after a fill and the debate changes.
- Risk committee then judge. Aggressive / conservative / neutral vote a size. Sato takes the median and simulates the next book against hard limits: gross 80%, single-name 25%, sector 40%, short 15%, daily VaR $40k, drawdown 8% of peak NAV. Breach → trim in 0.5% steps, or veto if the name cannot fit. IV and beta can haircut size (trim) with a WARNING; they do not invent a veto.
- Paper execution. Approve prices the ticket with slippage (`2bp + participation×4000 + IV×0.15`) and `1bp` fees. Cash moves at **fill px**, not the mark. Average cost uses the fill. Blotter stores the fill, slip, fee, and cash delta.
- Yahoo last (when reachable). JSON book persist on a writable disk, or Vercel Blob when `DESK_STORE=blob`.

**Stubbed:**

- Quotes default to sample closes as-of 18 Sep 2026 (`NVDA` `AAPL` `MSFT` `TSLA` `JPM` `XOM`) when Yahoo does not answer. LIVE overlay is last/change/volume/spark only; fundamentals and vol stay paper.
- The news wire is a deterministic paper file (`src/lib/desk/news.ts`), not a news API.
- Debate *wording* is rendered from structured claims when `NVIDIA_API_KEY` is unset (MOCK). NIM may rewrite wording only, model locked to `google/gemma-4-31b-it`.
- Fills never hit a live exchange (`LIVE_TRADING=false`). Default `PAPER_BROKER=off` uses the local slip+fee simulator. `PAPER_BROKER=alpaca` can submit **paper** orders only; live Alpaca hosts are refused. P&L is mark-to-book on the marks on the tape.
- On Vercel / serverless without Blob, `data/` is not writable; the store uses `/tmp` (`durable: false`) and does not survive cold starts.
- Demo auth is a shared access code + signed cookie, not a full identity provider.

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
| **Run desk** | Strip | Starts the mock debate with no key (no network). With `NVIDIA_API_KEY`, wording may come from NIM `google/gemma-4-31b-it`. |
| **Refresh marks** | Strip | Yahoo last. On failure, SAMPLE marks stay. Does not run the desk. |
| **Reset book** | Strip | Seed book + SAMPLE marks + seed blotter; persists to the JSON store. |
| **Veto / Approve** | Ticket | Veto leaves the book. Approve paper-fills at slip+fee (local simulator, or Alpaca **paper** when `PAPER_BROKER=alpaca` and keys are set). Never live. |
| **LIVE / SAMPLE** | Masthead | LIVE after Yahoo last. SAMPLE on fallback or after Reset book. |
| **MOCK / NVIDIA/google/gemma-4-31b-it** | Masthead | MOCK with no key. NVIDIA/google/gemma-4-31b-it when NIM rewrote wording. |
| **off / alpaca / missing-keys** | Masthead | Paper broker badge. |
| **HEALTH** | Footer | `/api/health` line: MARKS, LLM, STORE FILE / TMP / BLOB, AUTH ON/OFF, BROKER, LIVE false. |

## Citations

- Xiao, Y., Su, Y., Deng, Y., et al. (2024). *TradingAgents: Multi-Agents LLM Financial Trading Framework*. arXiv:2412.20138. https://arxiv.org/abs/2412.20138
- Tauric Research. *TradingAgents*. https://github.com/TauricResearch/TradingAgents

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui primitives. Cream paper `#F4F0E6`, ink, copper. Newsreader + IBM Plex Sans + IBM Plex Mono.
