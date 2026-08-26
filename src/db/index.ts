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
  img?: string
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
      stock INT NOT NULL, blurb TEXT NOT NULL, img TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY, product_id INT NOT NULL REFERENCES products(id), qty INT NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY, product_id INT NOT NULL REFERENCES products(id),
      author TEXT NOT NULL, rating REAL NOT NULL, text TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  `)
  const { rows } = await db.query<{ c: string }>('SELECT COUNT(*)::text AS c FROM products')
  if (rows[0]?.c === '0') {
    await db.exec(`
      INSERT INTO products (name, brand, category, price_cents, rating, stock, blurb, img) VALUES
      ('AeroRun Glide 5','Velocity','running',12900,4.6,12,'Daily trainer with plush foam, 8oz', '/img/products/1.jpg'),
      ('TrailBeast GTX','Summit','outdoor',17900,4.4,7,'Waterproof trail runner, aggressive grip', '/img/products/2.jpg'),
      ('Cloudstep Classic','Nimbus','casual',8900,4.2,20,'Minimalist leather sneaker', '/img/products/3.jpg'),
      ('PowerLift Pro','IronCore','gym',13900,4.7,9,'Flat-sole lifting shoe, wide toe box', '/img/products/4.jpg'),
      ('SprintEdge Carbon','Velocity','running',24900,4.8,4,'Carbon-plated race day shoe', '/img/products/5.jpg'),
      ('CourtKing 2','Rally','court',10900,4.1,15,'Indoor court shoe with herringbone sole', '/img/products/6.jpg'),
      ('Weekend Canvas','Nimbus','casual',5900,3.9,30,'Washed canvas low-top', '/img/products/7.jpg'),
      ('FleeceHood Heavy','NorthLoop','apparel',7400,4.5,25,'450gsm brushed fleece hoodie', '/img/products/8.jpg'),
      ('RainShell 10k','NorthLoop','apparel',15900,4.3,11,'Packable waterproof shell', '/img/products/9.jpg'),
      ('Merino Crew Sock x3','Summit','apparel',2900,4.6,40,'Odor-resistant merino blend 3-pack', '/img/products/10.jpg'),
      ('ChefKnife 8in','ForgeWorks','kitchen',9900,4.9,6,'VG-10 steel, full tang', '/img/products/11.jpg'),
      ('CastIron Skillet 12','ForgeWorks','kitchen',6500,4.8,10,'Pre-seasoned, oven safe', '/img/products/12.jpg');
    `)
    await db.exec(`
      INSERT INTO reviews (product_id, author, rating, text) VALUES
      (1,'marathon_mike',5,'Ran 40 miles in week one. Zero break-in period.'),
      (1,'sana_k',4,'True to size but the toebox runs wide.'),
      (2,'gregor_h',3,'Grip is amazing, sizing chart lied though - size up.'),
      (5,'trackdad',5,'My kid dropped 2s off her 1600m time. Worth every cent.'),
      (7,'priya',4,'Perfect errand sneaker, canvas scuffs fast but that is the look.'),
      (11,'chef_bear',5,'Came stupid sharp out of the box. Holds an edge.'),
      (12,'homecook99',5,'My grandmother would approve. Seasoned perfectly.'),
      (8,'dan_w',2,'Sleeve cuffs are tight if you have forearms.');
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
