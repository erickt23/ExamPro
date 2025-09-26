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
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let pool;
let db;

pool = new PgPool({
  connectionString: process.env.DATABASE_URL,
});
db = drizzle(pool, { schema });

export { pool, db };