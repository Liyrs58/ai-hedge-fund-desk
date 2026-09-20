# Limitations

1. **Paper only.** `LIVE_TRADING` cannot enable. No live exchange routing.
2. **Not VaR.** `dailyRiskProxy` is vol-weighted exposure, not statistical VaR.
3. **Fundamentals are sample.** PE, FCF yield, IV, beta, mkt cap are not refreshed from Yahoo.
4. **News is a wire file.** Not a real-time news API; polarity is hand-set.
5. **Agents are modules.** Structured decision functions + optional NIM prose rewrite — not autonomous capital allocators.
6. **Yahoo can fail.** Network blocks / rate limits → SAMPLE marks; desk still runs offline.
7. **Serverless store.** Without Vercel Blob, JSON book under `/tmp` is not durable across instances.
8. **Demo auth** is a shared code + cookie, not an IdP.
9. **No performance claims.** This repo does not publish audited returns.
10. **Teaching / research simulator.** Not a hedge fund, not advice, not an offer of securities.
