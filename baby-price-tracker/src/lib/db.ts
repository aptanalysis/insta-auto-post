import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

let client: Client | null = null;
let ready: Promise<void> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    naver_product_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    image TEXT,
    link TEXT,
    mall_name TEXT,
    brand TEXT,
    category_slug TEXT,
    query TEXT NOT NULL,
    initial_price INTEGER NOT NULL,
    current_price INTEGER,
    current_mall TEXT,
    current_link TEXT,
    lowest_price INTEGER,
    lowest_at TEXT,
    target_price INTEGER,
    drop_pct REAL,
    last_alert_price INTEGER,
    last_alert_at TEXT,
    offers_json TEXT,
    check_error TEXT,
    last_checked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price INTEGER NOT NULL,
    mall_name TEXT,
    checked_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_history_product ON price_history(product_id, checked_at)`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price INTEGER NOT NULL,
    usual_price INTEGER,
    mall_name TEXT,
    link TEXT,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

function getClient(): Client {
  if (client) return client;
  const url = process.env.DATABASE_URL || "file:./data/app.db";
  if (url.startsWith("file:")) {
    const p = url.slice("file:".length);
    fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
  }
  client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
  return client;
}

export async function db(): Promise<Client> {
  const c = getClient();
  if (!ready) {
    ready = (async () => {
      await c.execute("PRAGMA foreign_keys = ON").catch(() => {});
      for (const s of SCHEMA) await c.execute(s);
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  await ready;
  return c;
}

export async function all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const r = await (await db()).execute({ sql, args });
  return r.rows.map((row) => ({ ...row }) as T);
}

export async function one<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args: InValue[] = []) {
  return (await db()).execute({ sql, args });
}

export type ProductRow = {
  id: number;
  naver_product_id: string;
  title: string;
  image: string | null;
  link: string | null;
  mall_name: string | null;
  brand: string | null;
  category_slug: string | null;
  query: string;
  initial_price: number;
  current_price: number | null;
  current_mall: string | null;
  current_link: string | null;
  lowest_price: number | null;
  lowest_at: string | null;
  target_price: number | null;
  drop_pct: number | null;
  last_alert_price: number | null;
  last_alert_at: string | null;
  offers_json: string | null;
  check_error: string | null;
  last_checked_at: string | null;
  created_at: string;
};

export type Offer = { mallName: string; price: number; link: string; title: string; exact: boolean };
