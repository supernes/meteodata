import * as mqtt from "mqtt"
import { logger } from "../common.js";

export class MeteoClient {
  config

  /***
   * @type {mqtt.MqttClient}
   */
  #client

  /**
   * @type {Set<(topic: string, payload: string) => void>}
   */
  #callbacks = new Set()

  constructor(config) {
    this.config = config;
  }

  connect() {
    const { host, port, username, password, secure, endpoint } = this.config;
    const uri = `${secure === true ? 'wss' : 'ws'}://${host}:${port}/${endpoint}`;

    this.#client = mqtt.connect(uri, {
      username,
      password,

      queueQoSZero: false
    });

    this.#client.on('connect', () => {
      logger.info(`MQTT client connected to ${uri}`);

      const { topic } = this.config;

      this.#client.subscribe(topic + '+');

      process.on('beforeExit', (code) => {
        if (this.#client) {
          console.log('Shutting down mqtt client');
          this.#client.end();
        }
      })
    });

    this.#client.on('disconnect', () => {
      logger.info('MQTT client disconnected');
    })

    this.#client.on('message', (topic, payload) => {
      const payload_str = payload.toString();
      const topic_short = topic.replace(this.config.topic, "");

      for (const cb of this.#callbacks) {
        cb(topic_short, payload_str);
      }
    });

    this.#client.on('error', (error) => {
      logger.error('MQTT client error', { error });
    });
  }

  /**
   * 
   * @param {(topic: string, payload: string) => void} callback 
   */
  addMessageCallback(callback) {
    if (typeof callback === 'function') {
      this.#callbacks.add(callback);
    }
  }

  /**
  * 
  * @param {(topic: string, payload: string) => void} callback 
  */
  removeMessageCallback(callback) {
    this.#callbacks.delete(callback);
  }
}