import { logger } from './common.js'
import {MeteoDatabase} from './services/better-database.js'

logger.info('Initializing better db');

const daba = new MeteoDatabase({
  path: './db/better-testing.db'
});

// console.log(daba.db.exec('SELECT 1+1'));

daba.insertMeasurement(99, 'test', '0');
console.log(daba.getLastHourAverage());

// await new Promise(res => setTimeout(res, 3000));