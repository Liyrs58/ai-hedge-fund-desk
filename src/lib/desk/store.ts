import fs from "node:fs";
import path from "node:path";
import { attachSectors, SEED_BOOK } from "./book";
import { SEED_BLOTTER } from "./blotter";
import { UNIVERSE } from "./universe";
import type { Book, Ticket } from "./types";

export type StoreBackend = "blob" | "json-file";

export interface DeskSnapshot {
  book: Book;
  blotter: Ticket[];
  updatedAt: string | null;
}

export interface StoreInfo {
  backend: StoreBackend;
  path: string;
  durable: boolean;
  writable: boolean;
  updatedAt: string | null;
}

const DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_FILE = path.join(DATA_DIR, "desk-store.json");
const TMP_FILE = "/tmp/ahf-desk-store.json";
const BLOB_PATH = "ahf-desk-store.json";

function seedSnapshot(): DeskSnapshot {
  return {
    book: attachSectors(SEED_BOOK, UNIVERSE),
    blotter: SEED_BLOTTER,
    updatedAt: null,
  };
}

function existsFile(file: string): boolean {
  return fs.existsSync(/*turbopackIgnore: true*/ file);
}

function readFile(file: string): string {
  return fs.readFileSync(/*turbopackIgnore: true*/ file, "utf8");
}

function writeFile(file: string, body: string): void {
  fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  fs.writeFileSync(/*turbopackIgnore: true*/ file, body, "utf8");
}

function canWrite(dir: string): boolean {
  try {
    fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    fs.accessSync(/*turbopackIgnore: true*/ dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function resolveFile(): { file: string; durable: boolean } {
  const override = process.env.DESK_STORE_PATH?.trim();
  if (override) {
    return { file: override, durable: !override.startsWith("/tmp") };
  }
  if (canWrite(DATA_DIR)) {
    return { file: LOCAL_FILE, durable: true };
  }
  return { file: TMP_FILE, durable: false };
}

function blobToken(): string {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() ?? "";
}

export function blobStoreRequested(): boolean {
  return (process.env.DESK_STORE ?? "").trim().toLowerCase() === "blob";
}

export function blobStoreEnabled(): boolean {
  return blobStoreRequested() && Boolean(blobToken());
}

export function storeBackend(): StoreBackend {
  return blobStoreEnabled() ? "blob" : "json-file";
}

function parseSnapshot(raw: unknown): DeskSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<DeskSnapshot>;
  if (!data.book || !Array.isArray(data.blotter)) return null;
  return {
    book: data.book,
    blotter: data.blotter,
    updatedAt: data.updatedAt ?? null,
  };
}

async function readBlobStore(): Promise<DeskSnapshot | null> {
  const { get } = await import("@vercel/blob");
  for (const access of ["private", "public"] as const) {
    try {
      const result = await get(BLOB_PATH, { access, useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) continue;
      const text = await new Response(result.stream).text();
      const parsed = parseSnapshot(JSON.parse(text));
      if (parsed) return parsed;
    } catch {
      /* try the other access mode */
    }
  }
  return null;
}

async function writeBlobStore(next: DeskSnapshot): Promise<void> {
  const { put } = await import("@vercel/blob");
  const body = `${JSON.stringify(next, null, 2)}\n`;
  const options = {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  } as const;
  try {
    await put(BLOB_PATH, body, { ...options, access: "private" });
  } catch {
    await put(BLOB_PATH, body, { ...options, access: "public" });
  }
}

function readJsonFile(): DeskSnapshot {
  const { file } = resolveFile();
  try {
    if (!existsFile(file)) return seedSnapshot();
    const parsed = parseSnapshot(JSON.parse(readFile(file)));
    return parsed ?? seedSnapshot();
  } catch {
    return seedSnapshot();
  }
}

function writeJsonFile(next: DeskSnapshot): DeskSnapshot {
  const { file } = resolveFile();
  writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export async function storeInfo(): Promise<StoreInfo> {
  if (blobStoreEnabled()) {
    let updatedAt: string | null = null;
    try {
      const snap = await readBlobStore();
      updatedAt = snap?.updatedAt ?? null;
    } catch {
      updatedAt = null;
    }
    return {
      backend: "blob",
      path: BLOB_PATH,
      durable: true,
      writable: true,
      updatedAt,
    };
  }
  const { file, durable } = resolveFile();
  let updatedAt: string | null = null;
  try {
    if (existsFile(file)) {
      const raw = parseSnapshot(JSON.parse(readFile(file)));
      updatedAt = raw?.updatedAt ?? null;
    }
  } catch {
    updatedAt = null;
  }
  return {
    backend: "json-file",
    path: file,
    durable,
    writable: canWrite(path.dirname(file)),
    updatedAt,
  };
}

export async function readDeskStore(): Promise<DeskSnapshot> {
  if (blobStoreEnabled()) {
    try {
      return (await readBlobStore()) ?? seedSnapshot();
    } catch {
      return seedSnapshot();
    }
  }
  return readJsonFile();
}

export async function writeDeskStore(book: Book, blotter: Ticket[]): Promise<DeskSnapshot> {
  const next: DeskSnapshot = {
    book,
    blotter: blotter.slice(0, 24),
    updatedAt: new Date().toISOString(),
  };
  if (blobStoreEnabled()) {
    await writeBlobStore(next);
    return next;
  }
  return writeJsonFile(next);
}

export async function resetDeskStore(): Promise<DeskSnapshot> {
  const seed = seedSnapshot();
  return writeDeskStore(seed.book, seed.blotter);
}
