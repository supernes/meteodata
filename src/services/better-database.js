import { logger } from '../common.js'
import Database from 'better-sqlite3'

export class MeteoDatabase {
  config
  db
  /**
   * @type {{[k: string]: import('better-sqlite3').Statement}}
   */
  stmts = {}

  constructor(config) {
    this.config = config;

    try {
      this.db = new Database(config.path);
    } catch (error) {
      logger.error("Failed to open database", { error });
    }

    // process.on('exit', () => this.db?.close());

    this.#prepareStatements();
  }

  #prepareStatements() {
    if (!this.db) {
      return;
    }

    // const { exec, prepare } = this.db;

    // Ensure schema

    try {
      this.db.exec(`CREATE TABLE IF NOT EXISTS "meteodata" (
        "ts"	INTEGER NOT NULL,
        "field"	INTEGER NOT NULL,
        "prop"	TEXT,
        "value"	TEXT
      )`);

      this.db.exec(`CREATE INDEX IF NOT EXISTS "ts_ix" ON "meteodata" ("ts")`);
    } catch (error) {
      logger.error("Failed to prepare database schema", { error });
      return;
    }

    try {
      this.stmts['insert'] = this.db.prepare(`INSERT INTO "meteodata" VALUES(unixepoch(), ?, ?, ?)`);
      this.stmts['lasthour'] = this.db.prepare(`SELECT "field", avg("value") as "value"
        FROM "meteodata"
        WHERE "ts" >= unixepoch() - 3600
        GROUP BY "field"`);
    } catch (error) {
      logger.error("Database statement preparation failed", { error });
    }
  }

  /**
   * 
   * @param {number} field 
   * @param {string} prop 
   * @param {string} value 
   */
  insertMeasurement(field, prop, value) {
    if (!this.db) {
      logger.error("Database not opened", { ctx: 'insertMeasurement' });
      return false;
    }

    try {
      this.stmts['insert'].run(field, prop, value);
      return true;
    } catch (error) {
      logger.warn("SQL INSERT failed", { error });
      return false;
    }
  }

  getLastHourAverage() {
    if (!this.db) {
      logger.error("Database not opened", { ctx: 'getLastHourAverage' });
      return;
    }

    try {
      return this.stmts['lasthour'].all();
    } catch (error) {
      logger.warn("SQL SELECT for hourly average failed", { error });
      return [];
    }
  }
}