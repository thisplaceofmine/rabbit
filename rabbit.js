const amqplib = require('amqplib');
const { isPlainObject } = require('lodash');

class DirectQueue {
  constructor(event, path) {
    this.path = this.init(path);
    this.event = event;
    this.connection = null;
    this.channel = null;
  }

  init(path = {}) {
    if (typeof path === 'string') return path;
    if (isPlainObject(path)) {
      const {
        protocol = 'amqp',
        hostname = process.env.AMQP_HOST || 'localhost',
        port = process.env.AMQP_PORT || 5672,
        username = process.env.AMQP_USER || 'root',
        password = process.env.AMQP_PASSWORD || 'admin1234',
      } = path;
      return `${protocol}://${username}:${password}@${hostname}:${port}`;
    }
    throw new Error('Invalid path');
  }

  async getChannel() {
    if (this.channel) return this.channel;
    this.connection = await amqplib.connect(this.path);
    this.channel = await this.connection.createChannel();
    return this.channel;
  }

  async bind(channel, opts = {}) {
    const { exchange, queue, action } = opts;
    await channel.assertExchange(`${this.event}-exchange`, 'direct', exchange);
    await channel.assertQueue(`${this.event}-queue`, queue);
    await channel.bindQueue(
      `${this.event}-queue`,
      `${this.event}-exchange`,
      `${this.event}-${action || 'basic'}`
    );
  }

  async publish(message, opts = {}) {
    const { action = '' } = opts;
    const channel = await this.getChannel();
    await this.bind(channel, opts);
    await channel.publish(
      `${this.event}-exchange`,
      `${this.event}-${action || 'basic'}`,
      Buffer.from(JSON.stringify(message))
    );
    return true;
  }

  async consume(callback = () => {}, opts = {}) {
    const { prefetch } = opts;
    const channel = await this.getChannel();
    if (prefetch) await channel.prefetch(prefetch);
    await this.bind(channel, opts);

    let [msg, output] = [false, null];
    await channel.consume(`${this.event}-queue`, async (msg) => {
      if (msg !== null) {
        msg = true;
        output = await callback(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      }
    });
    return { output, msg };
  }

  async listen(callback = () => {}, opts = {}) {
    const { prefetch } = opts;
    const channel = await this.getChannel();
    if (prefetch) await channel.prefetch(prefetch);
    await this.bind(channel, opts);

    await channel.consume(`${this.event}-queue`, async (msg) => {
      if (msg !== null) {
        console.log(msg)
        await callback(JSON.parse(msg.content.toString()));
        channel.ack(msg);
      }
    });
    process.on('SIGINT', () => {
      channel.close();
      this.connection.close();
      process.exit(0);
    });
  }
}

module.exports = DirectQueue;
