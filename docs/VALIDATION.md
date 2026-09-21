# Validation

## Offline commands

```bash
npm ci
npm run lint
npm test          # finance-critical unit tests (node:test)
npm run paper     # end-to-end paper path smoke
npm run build     # Next.js production compile
```

GitHub Actions workflow `.github/workflows/ci.yml` runs the same sequence on push/PR (no live broker, no required secrets).

## Finance-critical coverage (`tests/finance-critical.test.ts`)

| Case | Asserts |
| --- | --- |
| Name limit in/out | Small add passes; oversized name trimmed or vetoed under 25% |
| Drawdown veto | DD above 8% of peak → veto, zero shares |
| Short limit | Huge short trimmed/vetoed under 15% |
| Sector limit | Tech sleeve cannot breach 40% without trim/veto |
| Fees / cash | BUY debits notional + 1bp fee |
| Average cost | Same-side add reweights avg |
| Close / reverse | Flat removes name; reverse resets avg |
| No fill after veto | `canFill` false; book unchanged |
| Live URL reject | `api.alpaca.markets` throws |
| Paper URL accept | `paper-api.alpaca.markets` ok |
| LIVE_TRADING | Hard-false |
| Risk proxy formula | Matches Σ |value|×iv×0.06 |
| Provenance | Sample universe groups present |
| Technicals | RSI/SMA from synthetic history |

## Honesty rule

Do not invent backtest Sharpe, live P&L, or win-rates. Paper smoke outcomes depend on the seed book and current marks; document them as computed, not marketed performance.
