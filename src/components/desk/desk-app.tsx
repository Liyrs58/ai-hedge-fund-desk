"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersisted } from "@/hooks/use-persisted";
import { AgentRoster, type DisplayStatus } from "./roster";
import { ControlStrip, type Pace, type View } from "./controls";
import { DebateStream } from "./tape";
import { DeskHeader } from "./header";
import { PositionTicket } from "./ticket-panel";
import { LiveDot } from "./marks";
import { marketLabel, useNow } from "./session-clock";
import {
  AGENTS,
  attachSectors,
  buildMockRun,
  buildRiskChecks,
  cloneBook,
  fillTicket,
  getQuote,
  markBook,
  padSession,
  type AgentId,
  type Book,
  type DebateMessage,
  type DeskRun,
  type SessionPayload,
  type Ticket,
} from "@/lib/desk";

const BOOK_KEY = "ahf:book";

function subscribeLg(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function lgSnapshot() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function DeskApp({ session }: { session: SessionPayload }) {
  const quotes = session.quotes;
  const quoteMap = useMemo(
    () => Object.fromEntries(quotes.map((q) => [q.symbol, q])),
    [quotes],
  );
  const seedBook = useMemo(
    () => attachSectors(cloneBook(session.book), quotes),
    [quotes, session.book],
  );

  const [ticker, setTicker] = useState(quotes[0]?.symbol ?? "NVDA");
  const [book, setBook] = usePersisted<Book>(BOOK_KEY, seedBook);
  const [run, setRun] = useState<DeskRun | null>(null);
  const [cursor, setCursor] = useState(0);
  const [pace, setPace] = useState<Pace>("stream");
  const [view, setView] = useState<View>("floor");
  const [focus, setFocus] = useState<AgentId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticks, setTicks] = useState(0);
  const isLg = useSyncExternalStore(subscribeLg, lgSnapshot, () => false);
  const now = useNow(1000);

  useEffect(() => {
    const id = setInterval(() => setTicks((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const quote = quoteMap[ticker] ?? quotes[0];
  const exposure = useMemo(() => markBook(book, quotes), [book, quotes]);
  const playing = !!run && cursor < run.messages.length;
  const messages = useMemo(
    () => run?.messages.slice(0, cursor) ?? [],
    [run, cursor],
  );
  const writing: AgentId | null =
    playing && run ? run.messages[cursor].agent : null;
  const running = playing;
  const proposalVisible = messages.some((m) => m.kind === "proposal");
  const ticket = run && proposalVisible ? run.ticket : null;
  const clock = now ? padSession(now) : "--:--:--";
  const uptime = formatUptime(ticks * 1000);

  const lastAt = useMemo(() => {
    const map = emptyTimes();
    for (const msg of messages) map[msg.agent] = msg.at;
    return map;
  }, [messages]);

  const statuses = useMemo(
    () => deriveDisplay(messages, writing, running),
    [messages, writing, running],
  );

  const checks = useMemo(
    () => (ticket ? buildRiskChecks(ticket, quote, exposure) : []),
    [ticket, quote, exposure],
  );

  useEffect(() => {
    if (!run || cursor >= run.messages.length) return;
    const delay = pace === "instant" ? 0 : run.messages[cursor].delayMs;
    const id = window.setTimeout(() => setCursor((c) => c + 1), delay);
    return () => window.clearTimeout(id);
  }, [run, cursor, pace]);

  const startRun = useCallback(() => {
    try {
      setError(null);
      setFocus(null);
      const q = getQuote(ticker);
      const built = buildMockRun(
        ticker,
        q,
        exposure.nav,
        new Date().toISOString(),
      );
      const next: DeskRun = {
        id: `run-${q.symbol}-${Date.now()}`,
        ticker: q.symbol,
        quote: q,
        messages: built.messages,
        ticket: built.ticket,
        provider: "mock",
        fallbackFrom: null,
      };
      setRun(next);
      // Instant dumps the full tape. Stream puts the first mark on immediately
      // so Run desk never looks dead while the rest of the script plays.
      setCursor(
        pace === "instant"
          ? next.messages.length
          : Math.min(1, next.messages.length),
      );
    } catch (err) {
      setRun(null);
      setCursor(0);
      setError(
        err instanceof Error ? err.message : "Desk failed to open the tape.",
      );
    }
  }, [ticker, exposure.nav, pace]);

  const skipToMark = useCallback(() => {
    if (!run) return;
    setCursor(run.messages.length);
  }, [run]);

  const onApprove = useCallback(() => {
    if (!run?.ticket || run.ticket.status !== "proposed") return;
    const next: Ticket = { ...run.ticket, status: "filled" };
    if (next.side !== "HOLD" && next.shares > 0) {
      setBook((prev) => attachSectors(fillTicket(prev, next), quotes));
    }
    setRun({ ...run, ticket: next });
    setCursor(run.messages.length);
  }, [run, quotes, setBook]);

  const onVeto = useCallback(() => {
    if (!run?.ticket || run.ticket.status !== "proposed") return;
    setRun({
      ...run,
      ticket: { ...run.ticket, status: "vetoed", vetoed: true },
    });
    setCursor(run.messages.length);
  }, [run]);

  const resetBook = useCallback(() => {
    setBook(seedBook);
    setRun(null);
    setCursor(0);
    setFocus(null);
    setError(null);
  }, [seedBook, setBook]);

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
      onVeto={onVeto}
      onApprove={onApprove}
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

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-paper">
      <DeskHeader quote={quote} />
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
        <span>DATA: PAPER</span>
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
    sentiment: "09:41:08",
    technical: "09:41:45",
    trader: "09:42:03",
    risk: "09:41:58",
  };
}

function deriveDisplay(
  messages: DebateMessage[],
  writing: AgentId | null,
  running: boolean,
): Record<AgentId, DisplayStatus> {
  const spoken = new Set(messages.map((m) => m.agent));
  const out = {} as Record<AgentId, DisplayStatus>;
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
