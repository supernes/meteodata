import { logger } from "../common.js";
import sqlite3 from "sqlite3"

export class MeteoDatabase {
  db
  config
  isOpen = false

  /**
   * @type { {[n: string]: sqlite3.Statement} }
   */
  statements = {}

  constructor(config) {
    this.config = config;

    this.db = new sqlite3.Database(this.config.path, error => {
      if (error != null) {
        logger.error("Failed to open database", { path: this.config.path });
        this.db = null;
        return;
      }

      process.on('beforeExit', () => {
        if (this.db) {
          this.db.close()
        }
      });

      this.db.on('open', () => {
        logger.info("Database opened", { path: this.config.path });
        this.#prepareStatements();
      });

      this.db.on('close', () => {
        logger.debug("Database closed", { path: this.config.path })
      });

      this.db.on('error', error => {
        if (error !== null) {
          logger.error("Databsae error", { error });
        }
      });
    });
  }

  #prepareStatements() {
    this.db.serialize(() => {
      // Ensure schema
      this.db.run(`CREATE TABLE IF NOT EXISTS "meteodata" (
        "ts"	INTEGER NOT NULL,
        "field"	INTEGER NOT NULL,
        "prop"	TEXT,
        "value"	TEXT
      )`);

      this.db.run(`CREATE INDEX IF NOT EXISTS "ts_ix" ON "meteodata" ("ts")`);

      // Prepare queries
      this.statements['insert'] = this.db.prepare(`INSERT INTO "meteodata" VALUES(unixepoch(), ?, ?, ?)`);

      this.statements['get_latest'] = this.db.prepare(`select ts, field, value
        from "meteodata"
          inner join (
            select max(ts) as ts, field
            from "meteodata"
            group by field
          ) using (field, ts)
        order by field asc`);

      this.statements['get_lasthour'] = this.db.prepare(`select "field", avg("value") as "value"
        from "meteodata"
        where "ts" >= unixepoch() - 3600
        group by "field"`);
    });
  }

  //

  /**
   * 
   * @param {number} field 
   * @param {string} prop 
   * @param {string} value 
   */
  insertMeasurement(field, prop, value) {
    if (!this.db) {
      return;
    }

    const stmt = this.statements['insert'];

    if (stmt) {
      stmt.run([field, prop, value], function (error) {
        if (error) {
          logger.error('Problem with insert query, params', {
            params: [field, prop, value], error
          });
        }
      });
    }
  }

  async getLatest() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.serialize(() => {
        this.statements['get_latest'].all((error, rows) => {
          if (error) {
            logger.warn('Failed to get latest measurements', { error });
            reject(error);
          } else {
            resolve(rows);
          }
        });
      });
    });
  }

  async getLastHourAverage() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.serialize(() => {
        this.statements['get_lasthour'].all((error, rows) => {
          if (error) {
            logger.warn('Failed to get hourly average', { error });
            reject(error);
          } else {
            resolve(rows);
          }
        });
      });
    });
  }

}