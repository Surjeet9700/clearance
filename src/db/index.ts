import { PGlite } from '@electric-sql/pglite'

// Single source of truth lives server-side inside TanStack Start server functions.
// In-memory PGlite: deterministic reseed on cold start = judges always see a clean, working store.
// HMR-safe via globalThis singleton.
const g = globalThis as unknown as { __cleranceDB?: PGlite }

export type Product = {
  id: number
  name: string
  brand: string
  category: string
  price_cents: number
  rating: number
  stock: number
  blurb: string
}

export type RuleSet = {
  balance_cents: number
  monthly_envelope_cents: number // total spendable by the agent this month
  spent_this_month_cents: number
  per_purchase_cap_cents: number // purchases above this need explicit approval
  auto_approve_below_cents: number // purchases at/below this auto-execute
  allowed_categories: string[] | null // null = all
  blocked_merchants: string[]
}

export type Receipt = {
  id: string
  ts: number
  kind: 'purchase' | 'undo' | 'blocked' | 'rule_change'
  item_ids: number[]
  total_cents: number
  actor: 'agent' | 'human'
  rule_fired: string | null
  reasoning: string | null
  prev_hash: string
  hash: string
  undone: boolean
}

async function init(db: PGlite) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL,
      category TEXT NOT NULL, price_cents INT NOT NULL, rating REAL NOT NULL,
      stock INT NOT NULL, blurb TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY, product_id INT NOT NULL REFERENCES products(id), qty INT NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  `)
  const { rows } = await db.query<{ c: string }>('SELECT COUNT(*)::text AS c FROM products')
  if (rows[0]?.c === '0') {
    await db.exec(`
      INSERT INTO products (name, brand, category, price_cents, rating, stock, blurb) VALUES
      ('AeroRun Glide 5','Velocity','running',12900,4.6,12,'Daily trainer with plush foam, 8oz'),
      ('TrailBeast GTX','Summit','outdoor',17900,4.4,7,'Waterproof trail runner, aggressive grip'),
      ('Cloudstep Classic','Nimbus','casual',8900,4.2,20,'Minimalist leather sneaker'),
      ('PowerLift Pro','IronCore','gym',13900,4.7,9,'Flat-sole lifting shoe, wide toe box'),
      ('SprintEdge Carbon','Velocity','running',24900,4.8,4,'Carbon-plated race day shoe'),
      ('CourtKing 2','Rally','court',10900,4.1,15,'Indoor court shoe with herringbone sole'),
      ('Weekend Canvas','Nimbus','casual',5900,3.9,30,'Washed canvas low-top'),
      ('FleeceHood Heavy','NorthLoop','apparel',7400,4.5,25,'450gsm brushed fleece hoodie'),
      ('RainShell 10k','NorthLoop','apparel',15900,4.3,11,'Packable waterproof shell'),
      ('Merino Crew Sock x3','Summit','apparel',2900,4.6,40,'Odor-resistant merino blend 3-pack'),
      ('ChefKnife 8in','ForgeWorks','kitchen',9900,4.9,6,'VG-10 steel, full tang'),
      ('CastIron Skillet 12','ForgeWorks','kitchen',6500,4.8,10,'Pre-seasoned, oven safe');
    `)
  }
}

export async function getDB(): Promise<PGlite> {
  if (!g.__cleranceDB) {
    const db = new PGlite()
    g.__cleranceDB = db
    await init(db)
  }
  return g.__cleranceDB
}

// ---- tiny hash chain for tamper-evident receipts (Web Crypto, sync-free) ----
export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}
