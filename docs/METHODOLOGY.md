# Methodology — multi-agent decision and risk-governance simulator

AHF Desk 04 is a **multi-agent decision and risk-governance simulator** for paper US cash equities. It is research-real in structure, not live capital, and not investment advice.

## What “multi-agent” means here

Eleven seats are **structured decision modules** (TypeScript functions) that read and write a shared blackboard of notes (`stance`, `score`, `claims`, `cited` ids):

| Layer | Seats | Role |
| --- | --- | --- |
| Analysts | FND / NWS / SEN / TEC | Score the name from the current quote + book + paper news wire |
| Debate | BUL / BER | Two-round bull/bear; round two must answer the opponent |
| Trader | TRD | One proposal (side, size, stop) from scores + exposure |
| Risk committee | AGR / CSV / NEU | Size votes; median feeds the judge |
| Judge | RSK | Hard book limits — trim / veto — last word |

The PM (you) still stamps **Approve** or **Veto**. Nothing routes to a live broker account.

## LLM boundary

NVIDIA NIM (`google/gemma-4-31b-it`) **may rewrite debate text only**. It must not invent fills, change sizes, set hard risk limits, touch accounting, or alter broker safety. Without `NVIDIA_API_KEY`, wording is deterministic MOCK prose from structured claims.

## Risk governance (in-process)

Hard limits (`src/lib/desk/limits.ts`):

- Gross 80% · single-name 25% · sector 40% · short 15%
- **dailyRiskProxy** $40,000 (vol-weighted exposure — **not** VaR; see `DATA_PROVENANCE.md`)
- Max drawdown 8% of peak NAV

Judge simulates the post-trade book, trims in 0.5% steps, or vetoes. IV/beta may haircut size (WARNING) but do not invent a veto alone.

## Paper execution

Approve prices with slip `2bp + participation×4000 + IV×0.15` and `1bp` fees. Cash moves at **fill px**. Average cost uses the fill. Default broker is the local simulator; optional Alpaca is **paper URL only**. `LIVE_TRADING` is hard-false.

## Citations

- Xiao et al. (2024). *TradingAgents*. arXiv:2412.20138 — conceptual seating, not a Python port.
