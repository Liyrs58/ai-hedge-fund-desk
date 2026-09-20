"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentRoster, type DisplayStatus } from "./roster";
import { ControlStrip, type Pace, type View } from "./controls";
import { DebateStream } from "./tape";
import { DeskHeader, type LlmBadge } from "./header";
import { PositionTicket } from "./ticket-panel";
import { LiveDot } from "./marks";
import { marketLabel, useNow } from "./session-clock";
import {
  AGENTS,
  attachSectors,
  buildMockRun,
  cloneBook,
  markBook,
  normalizeBook,
  NVIDIA_TIMEOUT_MS,
  padSession,
  SEED_BLOTTER,
  SEED_BOOK,
  UNIVERSE,
  withPeak,
  type AgentId,
  type Book,
  type DebateMessage,
  type DeskRun,
  type Quote,
  type QuoteSource,
  type SessionPayload,
  type Ticket,
} from "@/lib/desk";

const BOOK_KEY = "ahf:book";
const BLOTTER_KEY = "ahf:blotter";

function writeLocal(book: Book, blotter: Ticket[]) {
  try {
    window.localStorage.setItem(BOOK_KEY, JSON.stringify(book));
    window.localStorage.setItem(BLOTTER_KEY, JSON.stringify(blotter));
  } catch {
    /* private mode */
  }
}

function pushStore(book: Book, blotter: Ticket[], reset = false) {
  writeLocal(book, blotter);
  void fetch("/api/desk/book", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(reset ? { reset: true } : { book, blotter }),
  });
}

function subscribeLg(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function lgSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function DeskApp({ session }: { session: SessionPayload }) {
  const seedQuotes = session.quotes.length ? session.quotes : UNIVERSE;
  const [quotes, setQuotes] = useState<Quote[]>(seedQuotes);
  const [quoteSource, setQuoteSource] = useState<QuoteSource>(
    session.quoteSource ?? "sample",
  );
  const [marksBusy, setMarksBusy] = useState(false);
  const [marksNote, setMarksNote] = useState<string | null>(
    session.marksNote ?? null,
  );
  const [runBusy, setRunBusy] = useState(false);
  const quoteMap = useMemo(
    () => Object.fromEntries(quotes.map((q) => [q.symbol, q])),
    [quotes],
  );
  const factoryBook = useMemo(
    () => withPeak(attachSectors(cloneBook(SEED_BOOK), UNIVERSE), UNIVERSE),
    [],
  );

  const [ticker, setTicker] = useState(seedQuotes[0]?.symbol ?? "NVDA");
  const [bookRaw, setBookRaw] = useState<Book>(() => normalizeBook(session.book));
  const book = useMemo(() => normalizeBook(bookRaw), [bookRaw]);
  const [blotter, setBlotter] = useState<Ticket[]>(session.blotter);
  const [run, setRun] = useState<DeskRun | null>(null);
  const [cursor, setCursor] = useState(0);
  const [pace, setPace] = useState<Pace>("stream");
  const [view, setView] = useState<View>("floor");
  const [focus, setFocus] = useState<AgentId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [ticks, setTicks] = useState(0);
  const isLg = useSyncExternalStore(subscribeLg, lgSnapshot, () => false);
  const now = useNow(1000);

  useEffect(() => {
    const id = setInterval(() => setTicks((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    writeLocal(book, blotter);
  }, [book, blotter]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/desk/book", { cache: "no-store" });
        const data = (await res.json()) as {
          book?: Book;
          blotter?: Ticket[];
          updatedAt?: string | null;
        };
        if (cancelled || !data.book) return;
        if (data.updatedAt) {
          setBookRaw(normalizeBook(data.book));
          if (Array.isArray(data.blotter)) setBlotter(data.blotter);
          return;
        }
        const localBook = window.localStorage.getItem(BOOK_KEY);
        if (!localBook) return;
        const parsed = normalizeBook(JSON.parse(localBook) as Book);
        const rawBlotter = window.localStorage.getItem(BLOTTER_KEY);
        const parsedBlotter = rawBlotter
          ? (JSON.parse(rawBlotter) as Ticket[])
          : session.blotter;
        setBookRaw(parsed);
        setBlotter(parsedBlotter);
        pushStore(parsed, parsedBlotter);
      } catch {
        /* keep the SSR snapshot */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.blotter]);

  const [healthLine, setHealthLine] = useState("…");
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = (await res.json()) as {
          ok?: boolean;
          paperBroker?: string;
          liveTrading?: boolean;
          llm?: { badge?: string };
          quotes?: { badge?: string };
          store?: { durable?: boolean; backend?: string };
          auth?: { required?: boolean };
        };
        const marks = data.quotes?.badge ?? "UNKNOWN";
        const llm = data.llm?.badge ?? "MOCK";
        const store =
          data.store?.backend === "blob"
            ? "BLOB"
            : data.store?.durable
              ? "FILE"
              : "TMP";
        const auth = data.auth?.required ? "ON" : "OFF";
        setHealthLine(
          `${data.ok ? "OK" : "DOWN"} MARKS ${marks} LLM ${llm} STORE ${store} AUTH ${auth} BROKER ${data.paperBroker ?? "off"} LIVE ${data.liveTrading === true}`,
        );
      } catch {
        setHealthLine("DOWN");
      }
    };
    void load();
    const id = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(id);
  }, []);

  const quote = quoteMap[ticker] ?? quotes[0] ?? UNIVERSE[0];
  const exposure = useMemo(() => markBook(book, quotes), [book, quotes]);
  const playing = !!run && cursor < run.messages.length;
  const messages = useMemo(
    () => run?.messages.slice(0, cursor) ?? [],
    [run, cursor],
  );
  const writing: AgentId | null =
    playing && run ? run.messages[cursor].agent : null;
  const running = playing || runBusy;
  const proposalVisible = messages.some((m) => m.kind === "proposal");
  const ticket = run && proposalVisible ? run.ticket : null;
  const clock = now ? padSession(now) : "--:--:--";
  const uptime = formatUptime(ticks * 1000);
  const checks = run && proposalVisible ? run.checks : [];

  const lastAt = useMemo(() => {
    const map = emptyTimes();
    for (const msg of messages) map[msg.agent] = msg.at;
    return map;
  }, [messages]);

  const statuses = useMemo(
    () => deriveDisplay(messages, writing, running),
    [messages, writing, running],
  );

  useEffect(() => {
    if (!run || cursor >= run.messages.length) return;
    const delay = pace === "instant" ? 0 : run.messages[cursor].delayMs;
    const id = window.setTimeout(() => setCursor((c) => c + 1), delay);
    return () => window.clearTimeout(id);
  }, [run, cursor, pace]);

  const startRun = useCallback(() => {
    const q = quoteMap[ticker] ?? quotes[0];
    if (!q) {
      setError("No mark on the tape for that name.");
      return;
    }
    setError(null);
    setFocus(null);

    const applyRun = (next: DeskRun) => {
      setError(null);
      setRun(next);
      setCursor(
        pace === "instant"
          ? next.messages.length
          : Math.min(1, next.messages.length),
      );
    };

    const localMock = (fallbackFrom: DeskRun["fallbackFrom"] = null): DeskRun => {
      const built = buildMockRun(
        ticker,
        q,
        book,
        quotes,
        new Date().toISOString(),
      );
      return {
        id: `run-${q.symbol}-${Date.now()}`,
        ticker: q.symbol,
        quote: q,
        messages: built.messages,
        ticket: built.ticket,
        checks: built.checks,
        provider: "mock",
        fallbackFrom,
      };
    };

    if (session.provider !== "nvidia") {
      try {
        applyRun(localMock(null));
      } catch (err) {
        setRun(null);
        setCursor(0);
        setError(
          err instanceof Error ? err.message : "Desk failed to open the tape.",
        );
      }
      return;
    }

    setRunBusy(true);
    setError("Waiting on NVIDIA NIM. Cold start can take ~2 min.");
    void (async () => {
      try {
        const res = await fetch("/api/desk/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(NVIDIA_TIMEOUT_MS),
          body: JSON.stringify({ ticker: q.symbol, book, quotes }),
        });
        const data = (await res.json()) as DeskRun & { error?: string };
        if (!res.ok || !data?.messages || !data.ticket) {
          applyRun(localMock("nvidia"));
          return;
        }
        applyRun({
          ...data,
          ticker: q.symbol,
          quote: q,
        });
      } catch {
        applyRun(localMock("nvidia"));
      } finally {
        setRunBusy(false);
      }
    })();
  }, [ticker, book, quotes, quoteMap, pace, session.provider]);

  const skipToMark = useCallback(() => {
    if (!run) return;
    setCursor(run.messages.length);
  }, [run]);

  const onApprove = useCallback(() => {
    if (session.liveTrading) {
      setError("Live trading is disabled. Paper desk only.");
      return;
    }
    if (!run?.ticket || run.ticket.status !== "proposed" || approving) return;
    const quoteForFill = quoteMap[run.ticket.ticker] ?? quote;
    setApproving(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/desk/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            ticket: run.ticket,
            quote: quoteForFill,
            book,
            blotter,
            quotes,
          }),
        });
        const data = (await res.json()) as {
          book?: Book;
          blotter?: Ticket[];
          ticket?: Ticket;
          error?: string;
          fillSource?: string;
        };
        if (!res.ok || !data.ticket) {
          setError(data.error ?? "Approve failed. Paper fill not booked.");
          return;
        }
        if (data.book) setBookRaw(normalizeBook(data.book));
        if (Array.isArray(data.blotter)) setBlotter(data.blotter);
        writeLocal(
          data.book ? normalizeBook(data.book) : book,
          Array.isArray(data.blotter) ? data.blotter : blotter,
        );
        setRun({ ...run, ticket: data.ticket });
        setCursor(run.messages.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approve failed.");
      } finally {
        setApproving(false);
      }
    })();
  }, [run, quotes, quote, quoteMap, book, blotter, session.liveTrading, approving]);

  const onVeto = useCallback(() => {
    if (!run?.ticket || run.ticket.status !== "proposed") return;
    const next: Ticket = { ...run.ticket, status: "vetoed", vetoed: true };
    setRun({ ...run, ticket: next });
    const nextBlotter = [next, ...blotter].slice(0, 24);
    setBlotter(nextBlotter);
    pushStore(book, nextBlotter);
    setCursor(run.messages.length);
  }, [run, book, blotter]);

  const resetBook = useCallback(() => {
    setBookRaw(factoryBook);
    setBlotter(SEED_BLOTTER);
    pushStore(factoryBook, SEED_BLOTTER, true);
    setQuotes(UNIVERSE);
    setQuoteSource("sample");
    setMarksNote(null);
    setRun(null);
    setCursor(0);
    setFocus(null);
    setError(null);
  }, [factoryBook]);

  const refreshMarks = useCallback(async () => {
    setMarksBusy(true);
    try {
      const res = await fetch("/api/desk/quotes", { cache: "no-store" });
      const data = (await res.json()) as {
        source?: QuoteSource;
        quotes?: Quote[];
        note?: string;
      };
      if (Array.isArray(data.quotes) && data.quotes.length > 0) {
        setQuotes(data.quotes);
        setQuoteSource(data.source === "yahoo" ? "yahoo" : "sample");
        setMarksNote(
          data.source === "yahoo"
            ? null
            : (data.note ?? "Yahoo did not answer. Sample marks still on the tape."),
        );
        setRun(null);
        setCursor(0);
        setError(null);
      } else {
        setMarksNote("Yahoo did not answer. Sample marks still on the tape.");
      }
    } catch {
      setMarksNote("Yahoo did not answer. Sample marks still on the tape.");
    } finally {
      setMarksBusy(false);
    }
  }, []);

  const pane = (
    <AgentRoster
      statuses={statuses}
      lastAt={lastAt}
      live={running || messages.length > 0}
      uptime={uptime}
      selected={focus}
      onSelect={(id) => setFocus((prev) => (prev === id ? null : id))}
    />
  );

  const tape = (
    <DebateStream
      messages={messages}
      writing={writing}
      running={running}
      error={error}
      clock={clock}
      focus={focus}
    />
  );

  const right = (
    <PositionTicket
      ticket={ticket}
      pending={running && !proposalVisible}
      clock={clock}
      checks={checks}
      book={book}
      exposure={exposure}
      quotes={quoteMap}
      blotter={blotter}
      onVeto={onVeto}
      onApprove={onApprove}
      approving={approving}
    />
  );

  const floor = (
    <div className="grid h-full min-h-0 w-full flex-1 grid-cols-[minmax(260px,1fr)_minmax(340px,1.25fr)_minmax(280px,1.05fr)]">
      <div className="min-h-0 border-r border-ink">{pane}</div>
      <div className="flex min-h-0 min-w-0 flex-col border-r border-ink">{tape}</div>
      <div className="min-h-0">{right}</div>
    </div>
  );

  const stacked = (
    <Tabs defaultValue="tape" className="flex min-h-0 flex-1 flex-col gap-0">
      <TabsList
        variant="line"
        className="w-full rounded-none border-b border-ink bg-paper px-1"
      >
        <TabsTrigger
          value="roster"
          data-qa="tab-desk"
          className="rounded-none font-mono text-[10px] tracking-[0.16em] uppercase"
        >
          Desk
        </TabsTrigger>
        <TabsTrigger
          value="tape"
          data-qa="tab-transcript"
          className="rounded-none font-mono text-[10px] tracking-[0.16em] uppercase"
        >
          Transcript
        </TabsTrigger>
        <TabsTrigger
          value="ticket"
          data-qa="tab-ticket"
          className="rounded-none font-mono text-[10px] tracking-[0.16em] uppercase"
        >
          Ticket
        </TabsTrigger>
      </TabsList>
      <TabsContent value="roster" className="min-h-0 flex-1 overflow-auto">
        {pane}
      </TabsContent>
      <TabsContent
        value="tape"
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {tape}
      </TabsContent>
      <TabsContent value="ticket" className="min-h-0 flex-1 overflow-auto">
        {right}
      </TabsContent>
    </Tabs>
  );

  const showTabs = view === "tabs" || !isLg;
  const llmLabel: LlmBadge = run?.fallbackFrom
    ? "FALLBACK MOCK"
    : (run?.provider ?? session.provider) === "nvidia"
      ? "NVIDIA/google/gemma-4-31b-it"
      : "MOCK";

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-paper">
      <DeskHeader
        quote={quote}
        quoteSource={quoteSource}
        llm={llmLabel}
        paperBroker={session.paperBroker}
      />
      <ControlStrip
        quotes={quotes}
        ticker={ticker}
        onTicker={(symbol) => {
          setTicker(symbol);
          setRun(null);
          setCursor(0);
          setError(null);
          setFocus(null);
        }}
        pace={pace}
        onPace={(next) => {
          setPace(next);
          if (next === "instant" && run) {
            setCursor(run.messages.length);
          }
        }}
        view={view}
        onView={setView}
        running={running}
        canSkip={playing}
        onRun={startRun}
        onSkip={skipToMark}
        onReset={resetBook}
        onRefreshMarks={() => void refreshMarks()}
        marksBusy={marksBusy}
      />

      <div className="flex min-h-0 flex-1 flex-col border-y border-ink">
        {showTabs ? stacked : floor}
      </div>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-2.5 font-mono text-[11px] tracking-wide text-ink">
        <span className="flex items-center gap-2">
          CONNECTION:
          <LiveDot />
          <span className="text-copper">LIVE</span>
        </span>
        <span>
          MARKS: {quoteSource === "yahoo" ? "LIVE" : "SAMPLE"}
          {marksNote ? <span className="ml-2 text-mute">{marksNote}</span> : null}
        </span>
        <span>LLM: {llmLabel}</span>
        <span>TRADE: PAPER</span>
        <span>HEALTH: {healthLine}</span>
        <span>MARKET: {marketLabel(now)}</span>
        <span>LATENCY: 6ms</span>
        <span>FEED: PRIMARY</span>
        <span className="ml-auto">USER: TRADING.DESK</span>
        <span>CLEARANCE: PM</span>
      </footer>
    </div>
  );
}

function emptyTimes(): Record<AgentId, string> {
  return {
    fundamental: "09:41:02",
    news: "09:41:06",
    sentiment: "09:41:08",
    technical: "09:41:45",
    bull: "09:41:51",
    bear: "09:41:57",
    trader: "09:42:03",
    aggressive: "09:42:10",
    conservative: "09:42:14",
    neutral: "09:42:18",
    risk: "09:42:22",
  };
}

function deriveDisplay(
  messages: DebateMessage[],
  writing: AgentId | null,
  running: boolean,
): Record<AgentId, DisplayStatus> {
  const spoken = new Set(messages.map((m) => m.agent));
  const out = {} as Record<AgentId, DisplayStatus>;
  const committee: AgentId[] = ["aggressive", "conservative", "neutral"];
  for (const agent of AGENTS) {
    if (writing === agent.id) {
      out[agent.id] = "SPEAKING";
      continue;
    }
    if (running) {
      if (agent.id === "trader" && !spoken.has("trader")) {
        out[agent.id] = "READY";
        continue;
      }
      if (committee.includes(agent.id) && spoken.has("trader") && !spoken.has(agent.id)) {
        out[agent.id] = "READY";
        continue;
      }
      if (agent.id === "risk" && !spoken.has("risk")) {
        out[agent.id] = "WATCHING";
        continue;
      }
    }
    out[agent.id] = "IDLE";
  }
  return out;
}

function formatUptime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}
