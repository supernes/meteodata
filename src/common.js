import fs from 'fs'

import { createLogger, format, transports } from 'winston'
const { timestamp, colorize, combine } = format;

import 'winston-daily-rotate-file'

import { MESSAGE } from 'triple-beam'
import jsonStringify from 'safe-stable-stringify'

// Error constants

export const errors = {
  CONFIG_MISSING: -1,
  CONFIG_INVALID: -2
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

const customFileFormat = format((info, opts) => {
  const stringifiedRest = jsonStringify(Object.assign({}, info, {
    level: undefined,
    message: undefined,
    splat: undefined,
    timestamp: undefined
  }));

  info[MESSAGE] = `${info.timestamp} [${info.level}] ${info.message} ` + (stringifiedRest !== '{}'
    ? stringifiedRest
    : '');

  return info;
});

/**
 * @type winston.LoggerOptions
 */
let loggerOptions = {
  transports: [
    new transports.DailyRotateFile({
      frequency: '72h',
      filename: 'meteodata-%DATE%.log',
      dirname: './log',
      maxFiles: 3,
      level: config.log?.level ?? 'info',
      format: format.combine(
        timestamp(),
        customFileFormat()
      )
    })
  ]
};

if (process.env.NODE_ENV === 'development') {
  loggerOptions.transports.push(new transports.Console({
    level: 'debug',
    format: combine(
      timestamp(),
      colorize(),
      customFileFormat()
    )
  }));
}

export const logger = createLogger(loggerOptions);