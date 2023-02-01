import { logger } from "../common.js";
import { MeteoDatabase } from "./database.js";

import Koa from "koa"
import Router from "koa-router"

/**
 * 
 * @param {MeteoDatabase} database 
 * @returns 
 */
export function createWebApp(database) {
  if (database instanceof MeteoDatabase === false) {
    logger.warn("Invalid database reference", { type: typeof database });
    database = null;
  }

  const MeteoServer = new Koa();
  const router = new Router();

  router.get("/", (ctx) => {
    ctx.redirect('/lasthour');
  });

  router.get("/lasthour", async (ctx) => {
    try {
      const data = await database.getLastHourAverage();
      ctx.body = formatLHResponse(data);
    } catch (error) {
      ctx.status = 500;
      ctx.body = formatLHResponse([]);
    }
  });

  MeteoServer.use(router.routes(), pageNotFound, router.allowedMethods());

  return MeteoServer;
}

//

function pageNotFound(ctx) {
  ctx.status = 404;
  ctx.type = 'text';
  ctx.body = "Not Found";
}

/**
 * 
 * @param {{field: number, value: number}[]} data 
 * @returns 
 */
function formatLHResponse(data) {
  /**
   * @type {{name: string, columns: string[], values: (number|string)[]}}
   */
  const result = {
    name: "AirThingsCalibratedData",
    columns: [
      "time"
    ],
    values: [
      (new Date()).toISOString()
    ]
  };

  for (const { field, value } of data) {
    let has_match = true;

    switch (field) {
      case 7:
        result.columns.push('O3');
        break;
      case 8:
        result.columns.push('NO2');
        break;
      case 9:
        result.columns.push('SO2');
        break;
      case 10:
        result.columns.push('CO');
        break;
      case 18:
        result.columns.push('TEMP');
        break;
      case 38:
        result.columns.push('NOISE-Lvl-Left');
        break;
      case 39:
        result.columns.push('NOISE-Lvl-Right');
        break;
      case 23:
        result.columns.push('WIND-Speed');
        break;
      case 24:
        result.columns.push('WIND-Dir');
        break;
      default:
        has_match = false;
    }

    if (has_match) {
      result.values.push(value);
    }
  }

  return result;
}