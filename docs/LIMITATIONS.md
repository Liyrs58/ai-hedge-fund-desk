# Limitations

1. **Paper only.** `LIVE_TRADING` cannot enable. No live exchange routing.
2. **Not VaR.** `dailyRiskProxy` is vol-weighted exposure, not statistical VaR.
3. **Net exposure is displayed but has no separate hard cap.** Gross and short limits are enforced independently.
4. **Realized P&L is not tracked.** The book keeps average cost and exposes unrealized mark-to-basis P&L.
5. **Liquidity and beta are warnings.** ADV and beta do not hard-veto; IV can apply the coded size haircut.
6. **Minimum trade size** is 1.5% NAV; fills below it are vetoed.
7. **Fundamentals are sample.** PE, FCF yield, IV, beta, and market cap are not refreshed from Yahoo.
8. **News is a sample file.** It is not a real-time news API; polarity is hand-set.
9. **Agents are modules.** Structured decision functions + optional NIM prose rewrite — not autonomous capital allocators.
10. **Yahoo can fail.** Network blocks / rate limits → SAMPLE marks; the desk still runs offline.
11. **Serverless store.** Without Vercel Blob, JSON book under `/tmp` is not durable across instances.
12. **Demo auth** is a shared code + cookie, not an IdP.
13. **No performance claims.** This repo does not publish audited returns.
14. **Teaching / research simulator.** Not a hedge fund, not advice, not an offer of securities.
