"use client";

import { useState } from "react";

export function DemoGate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6">
      <div className="w-full max-w-md border border-ink bg-paper p-6">
        <p className="font-mono text-[10px] tracking-[0.18em] text-mute">AHF · DESK 04</p>
        <h1 className="font-heading mt-2 text-[32px] leading-none font-semibold tracking-[-0.03em]">
          Access
        </h1>
        <p className="mt-3 font-mono text-[12px] leading-relaxed text-dim">
          This public demo is gated. Enter the access code. No account, no IdP.
        </p>
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
            void (async () => {
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code }),
                });
                if (!res.ok) {
                  setError("Invalid access code.");
                  return;
                }
                window.location.reload();
              } catch {
                setError("Login failed.");
              } finally {
                setBusy(false);
              }
            })();
          }}
        >
          <label className="font-mono text-[10px] tracking-[0.16em] uppercase text-mute">
            Access code
            <input
              data-qa="demo-code"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="mt-1 w-full border border-ink bg-paper px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-copper"
            />
          </label>
          {error ? (
            <p className="font-mono text-[12px] text-copper" data-qa="demo-error">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            data-qa="demo-login"
            disabled={busy || !code.trim()}
            className="border border-copper bg-copper px-3 py-2 font-mono text-[11px] tracking-[0.16em] text-paper uppercase disabled:opacity-50"
          >
            {busy ? "Checking…" : "Enter desk"}
          </button>
        </form>
      </div>
    </div>
  );
}
