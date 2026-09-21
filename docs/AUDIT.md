# Quant audit — AHF Desk 04 (paper)

**As of:** 21 Sep 2026 (Europe/London)
**Branch reviewed:** `quant/audit-hardening-2026-09`
**Scope:** honesty of risk metrics, mark/fundamentals provenance, risk engine, agent claims, tests/CI.

This audit is descriptive of the pre-hardening codebase; Phase 2 remediations are tracked in the same PR.

---

## 1. `dailyVar` truth — CRITICAL

**Finding:** `Exposure.dailyVar` is **not** Value-at-Risk.

In `src/lib/desk/book.ts` (`markBook`):

```text
absVar += |position value| × (iv30/100) × 0.06
dailyVar = absVar
```

That is a **vol-weighted notional proxy** (IV×6% × absolute exposure). It is not:

- historical VaR (no return series, no percentile),
- parametric VaR (no Σ, no z-score on portfolio σ),
- nor a dollar loss at a confidence level.

UI and risk labels said “VaR” / “Portfolio VaR”; `RISK_LIMITS.dailyVar = 40_000` gated trims/vetoes under a false name.

**Remediation (Phase 2):** rename field/limit/labels to `dailyRiskProxy` (vol-weighted exposure). Purge incorrect “VaR” wording. Document the formula. Do **not** invent a historical VaR without stored returns.

---

## 2. Yahoo mark vs sample fundamentals — CRITICAL (provenance)

**Marks (Yahoo):** `fetchYahooSnap` hits `query1.finance.yahoo.com/v8/finance/chart` for last / change / volume / spark. On success, session `quoteSource = "yahoo"` and masthead **LIVE**. On failure/timeout: sample universe, **SAMPLE**.

**Fundamentals / vol / beta:** `peNtm`, `fcfYield`, `iv30`, `beta`, `mktCapB` always come from the static `UNIVERSE` sample table (`asOf` desk date in `limits.AS_OF`). Yahoo overlay does **not** refresh them. Pre-fix README note (“PE / RSI / IV stay paper”) was accurate for PE/IV but incomplete for technicals.

**Technicals:** `rsi14`, `macdHist`, `sma50`, `sma200` were also sample-only even when Yahoo closes were fetched (1mo range — insufficient for SMA200).

**News:** deterministic `NEWS_WIRE` in `news.ts`, not a live feed.

**Remediation:** attach `provenance` per field group (`mark` | `fundamentals` | `technicals` | `news`) with `source` + `asOf` on every `Quote`. Prefer RSI/SMA/MACD computed from fetched Yahoo history when bars suffice; else `sample`. Surface badges in UI.

---

## 3. Risk engine — CRITICAL (correctness of gates) / non-critical (labels)

**Hard gates (deterministic, in-process):** gross 80%, single-name 25%, sector 40%, short 15%, drawdown 8% of peak NAV, plus the misnamed daily risk proxy $40k. Judge simulates post-trade book via `fillTicket` + `markBook`, trims in 0.5% steps, vetoes if cannot fit / drawdown already breached.

**Soft haircuts:** IV and beta can trim size (WARNING); they do not invent veto alone.

**LLM boundary:** NVIDIA NIM may rewrite debate *wording* only (`provider.ts`). Ticket size, risk verdict, fills stay computed. `LIVE_TRADING` hard-false; live Alpaca URLs refused in `broker.assertPaperAlpacaBaseUrl`.

**Gap:** VaR naming (above). Otherwise engine logic matches documented hard limits.

---

## 4. Agent claim accuracy — NON-CRITICAL (wording) / CRITICAL if oversold as autonomous fund

Eleven seats are **structured decision modules** (functions on a blackboard), not independent capital allocators. Scores/claims are derived from the quote snapshot + book + paper news. NIM prose must not change numbers. Marketing that implies live multi-agent AUM or autonomous risk ownership would be false.

**Remediation:** document as “multi-agent decision and risk-governance **simulator**”; NIM may rewrite debate text only.

---

## 5. Tests / CI — CRITICAL (coverage gap)

Pre-hardening:

- `npm run paper` / `runPaperPath` — smoke (NVDA buy+fill, TSLA short, live URL reject, paper URL accept, LIVE_TRADING false).
- No unit suite for name/sector/short/drawdown limits, fees/cash, average cost, close/reverse, no-fill-after-veto.
- No GitHub Actions offline CI for lint/build/tests (only investor-pitch embed workflow).

**Remediation:** finance-critical `node:test` suite + offline CI workflow.

---

## 6. Critical vs non-critical summary

| Item | Severity | Status after Phase 2 |
| --- | --- | --- |
| Misnamed `dailyVar` / VaR labels | **Critical** | Renamed to `dailyRiskProxy`; VaR wording purged |
| Missing field-group provenance | **Critical** | `Quote.provenance` + UI badges; technicals from history when possible |
| No finance unit tests / offline CI | **Critical** | Added |
| Overselling “agents” as live fund | **Critical** (comms) | Methodology / README simulator wording |
| Sample PE/IV/news when Yahoo up | Non-critical (honest if labeled) | Labeled SAMPLE / WIRE |
| Pitch modal / README polish | Non-critical | Unrelated to risk truth |

---

## 7. Hard rules preserved

- Eleven-seat paper desk architecture unchanged.
- `LIVE_TRADING === false` always; env ignored.
- Alpaca live hosts rejected.
- LLM cannot set hard risk limits, accounting, or broker safety.
