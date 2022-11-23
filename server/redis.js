// @ts-check
require("dotenv").config();
const redis = require("redis");

const endpoint = process.env.REDIS_ENDPOINT_URL || "127.0.0.1:6379";
const password = process.env.REDIS_PASSWORD || null;

const [host, port] = endpoint.split(":");

const resolvePromise = (resolve, reject) => {
  return (err, data) => {
    if (err) {
      reject(err);
    }
    resolve(data);
  };
};

const auth = (client) => new Promise((a, b) => {
  if (password === null) {
    a(true);
  } else {
    client.auth(password, resolvePromise(a, b));
  }
});

/** @type {import('redis').RedisClient} */
//const client = redis.createClient(+port, host);

const client = redis.createClient(+port, host, {
   retry_strategy: function(options) {
      if (options.error && options.error.code === "ECONNREFUSED" || "ETIMEDOUT" || "CONNECTION_BROKEN") {
         // If redis refuses the connection or is not able to connect
         //return new Error("The server refused the connection");
         return Math.min(options.attempt * 100, 3000);
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
         // End reconnection after the specified time limit
         return new Error("Retry time exhausted");
      }
      if (options.attempt > 10) {
         // End reconnecting with built in error
         return undefined;
      }
      // reconnect after
      return Math.min(options.attempt * 100, 3000);
   },
});

/** @type {import('redis').RedisClient} */
const sub = redis.createClient(+port, host, password === null ? undefined : {
  password
});

module.exports = {
  client,
  sub,
  auth: async () => {
    await auth(client);
    await auth(sub);
  },
  incr: (key = "key") =>
    new Promise((a, b) => client.incr(key, resolvePromise(a, b))),
  decr: (key = "key") =>
    new Promise((a, b) => client.decr(key, resolvePromise(a, b))),
  hmset: (key = "key", values = []) =>
    new Promise((a, b) => client.hmset(key, values, resolvePromise(a, b))),
  exists: (key = "key") =>
    new Promise((a, b) => client.exists(key, resolvePromise(a, b))),
  hexists: (key = "key", key2 = "") =>
    new Promise((a, b) => client.hexists(key, key2, resolvePromise(a, b))),
  set: (key = "key", value) =>
    new Promise((a, b) => client.set(key, value, resolvePromise(a, b))),
  get: (key = "key") =>
    new Promise((a, b) => client.get(key, resolvePromise(a, b))),
  hgetall: (key = "key") =>
    new Promise((a, b) => client.hgetall(key, resolvePromise(a, b))),
  zrangebyscore: (key = "key", min = 0, max = 1) =>
    new Promise((a, b) =>
      client.zrangebyscore(key, min, max, resolvePromise(a, b))
    ),
  zadd: (key = "key", key2 = "", value) =>
    new Promise((a, b) => client.zadd(key, key2, value, resolvePromise(a, b))),
  sadd: (key = "key", value) =>
    new Promise((a, b) => client.sadd(key, value, resolvePromise(a, b))),
  hmget: (key = "key", key2 = "") =>
    new Promise((a, b) => client.hmget(key, key2, resolvePromise(a, b))),
  sismember: (key = "key", key2 = "") =>
    new Promise((a, b) => client.sismember(key, key2, resolvePromise(a, b))),
  smembers: (key = "key") =>
    new Promise((a, b) => client.smembers(key, resolvePromise(a, b))),
  srem: (key = "key", key2 = "") =>
    new Promise((a, b) => client.srem(key, key2, resolvePromise(a, b))),
};
