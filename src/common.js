import fs from 'fs'
import * as winston from 'winston'

const { combine, timestamp, prettyPrint } = winston.format;

// Error constants

export const errors = {
  CONFIG_MISSING: -1,
  CONFIG_INVALID: -2,
  SERVER_INIT_FAIL: -3,
}

// Configuration

export let config;

const CONFIG_PATH = process.env.NODE_ENV === 'development'
  ? './config.dev.json'
  : './config.json';

const hasConfig = fs.existsSync(CONFIG_PATH);

if (!hasConfig) {
  console.error(`Missing configuration file. Please create a config file at`, fs.realpathSync(CONFIG_PATH));
  process.exit(errors.CONFIG_MISSING);
}

try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH));
} catch (error) {
  console.error('Failed to load configuration file.', error);
  process.exit(errors.CONFIG_INVALID);
}

// Logging

export const logger = winston.createLogger({
  level: config.log?.level ?? 'info',
  format: combine(timestamp(),
    prettyPrint({
      colorize: true
    })),
  transports: [
    new winston.transports.Console()
  ]
});