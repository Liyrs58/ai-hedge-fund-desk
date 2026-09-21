# Data provenance

Every `Quote` carries `provenance` for four field groups. The UI **PROVENANCE** strip shows `SOURCE · asOf` for each.

| Group | Fields | Sources |
| --- | --- | --- |
| **MARK** | `mark`, `change`, `changePct`, `volumeM`, `spark` | `yahoo` when chart last succeeds; else `sample` |
| **FUNDAMENTALS** | `peNtm`, `fcfYield`, `iv30`, `beta`, `mktCapB`, `avgVolumeM` | Always `sample` (static universe table, desk `AS_OF`) |
| **TECHNICALS** | `rsi14`, `macdHist`, `sma50`, `sma200` | `computed` from Yahoo daily closes (1y) when bars suffice; else `sample` |
| **NEWS** | wire headlines / polarity | Always `wire` (`src/lib/desk/news.ts`) |

## Yahoo

`GET query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1y`. No API key. Timeouts / empty payloads → full SAMPLE tape. Masthead **LIVE** means mark overlay succeeded, not that fundamentals are live.

## dailyRiskProxy (not VaR)

```text
dailyRiskProxy = Σ_positions |shares × mark| × (iv30 / 100) × 0.06
```

This is a **vol-weighted exposure proxy**. It is not historical or parametric Value-at-Risk. Earlier builds labeled it `dailyVar` / “VaR”; that wording was incorrect and has been purged.

## Sample as-of

Static universe closes and fundamentals: desk date `AS_OF` in `limits.ts` (currently **18 SEP 2026**).
