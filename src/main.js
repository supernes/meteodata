import { config, logger } from "./common.js";

import { MeteoDatabase } from "./services/database.js";
import { createWebApp } from "./services/webapp.js";
import { MeteoClient } from "./services/mqtt_client.js";

logger.info("Starting meteodata server", { pid: process.pid });

// Database

const database = new MeteoDatabase(config.database);

// HTTP Server

const port = config.webapp?.port ?? 3456;
const MeteoServer = createWebApp(database);
MeteoServer.listen(port);

logger.info(`Web server listening on port ${port}`);

// MQTT Client

const meteo = new MeteoClient(config.mqtt);

meteo.addMessageCallback(insertMeasurement);
meteo.connect();

// Helpers

function insertMeasurement(topic, payload) {
    if (typeof payload !== 'string' || payload.indexOf('=') < 0) {
        logger.warn('Malformed measurement payload', { type: typeof payload });
        return;
    }

    const field = parseInt(topic, 10);

    if (isNaN(field)) {
        logger.warn('Invalid measurement field id', { "field": topic });
        return;
    }

    const valid_fields = config.database?.filter_fields ?? [];

    if (valid_fields.length > 0 && valid_fields.includes(field) === false) {
        return;
    }

    const [prop, value] = payload.split("=", 2);

    database.insertMeasurement(field, prop, value);
}
