import fs from "node:fs";
import path from "node:path";
import { attachSectors, SEED_BOOK } from "./book";
import { SEED_BLOTTER } from "./blotter";
import { UNIVERSE } from "./universe";
import type { Book, Ticket } from "./types";

export interface DeskSnapshot {
  book: Book;
  blotter: Ticket[];
  updatedAt: string | null;
}

export interface StoreInfo {
  backend: "json-file";
  path: string;
  durable: boolean;
  writable: boolean;
  updatedAt: string | null;
}

const DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_FILE = path.join(DATA_DIR, "desk-store.json");
const TMP_FILE = "/tmp/ahf-desk-store.json";

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

export function storeInfo(): StoreInfo {
  const { file, durable } = resolveFile();
  let updatedAt: string | null = null;
  try {
    if (existsFile(file)) {
      const raw = JSON.parse(readFile(file)) as DeskSnapshot;
      updatedAt = raw.updatedAt ?? null;
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

export function readDeskStore(): DeskSnapshot {
  const { file } = resolveFile();
  try {
    if (!existsFile(file)) return seedSnapshot();
    const raw = JSON.parse(readFile(file)) as Partial<DeskSnapshot>;
    if (!raw.book || !Array.isArray(raw.blotter)) return seedSnapshot();
    return {
      book: raw.book,
      blotter: raw.blotter,
      updatedAt: raw.updatedAt ?? null,
    };
  } catch {
    return seedSnapshot();
  }
}

export function writeDeskStore(book: Book, blotter: Ticket[]): DeskSnapshot {
  const { file } = resolveFile();
  const next: DeskSnapshot = {
    book,
    blotter: blotter.slice(0, 24),
    updatedAt: new Date().toISOString(),
  };
  writeFile(file, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

export function resetDeskStore(): DeskSnapshot {
  const seed = seedSnapshot();
  return writeDeskStore(seed.book, seed.blotter);
}
