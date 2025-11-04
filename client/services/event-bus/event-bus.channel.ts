import type { ChannelTopics, SubscriptionCallback } from './event-bus.interface';

export class EventBusChannel {
  private readonly _channel: string;
  private readonly _topics = new Map<string, ChannelTopics<unknown>>();

  constructor(channel: string) {
    this._channel = channel;
  }

  register<D>(topic: string, callback: SubscriptionCallback<D>): void {
    if (!this._topics.has(topic)) {
      this._topics.set(topic, new Map());
    }

    const subscriptions = this._topics.get(topic);

    if (subscriptions) {
      const id = Symbol(topic);

      subscriptions.set(id, {
        callback: callback as SubscriptionCallback<unknown>,
        data: {
          id,
          channel: this._channel,
          topic: topic,
        },
      });
    }
  }

  callSubscribers<D>(topic: string, datagram: D): void {
    if (!this._topics.has(topic)) return;

    const subscriptions = this._topics.get(topic)!;

    subscriptions.forEach((sub) => {
      sub.callback({
        id: sub.data.id,
        channel: sub.data.channel,
        topic: sub.data.topic,
        payload: datagram,
      });
    });
  }
}
