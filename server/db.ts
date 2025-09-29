import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool as PgPool } from 'pg';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { config } from "dotenv";

config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Please provision a database?",
  );
}

let pool;
let db;

if (process.env.NODE_ENV === 'production') {
  neonConfig.webSocketConstructor = ws;
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon(pool, { schema });
} else {
  pool = new PgPool({
    connectionString: process.env.DATABASE_URL,
  });
  db = drizzle(pool, { schema });
}

export { pool, db };
