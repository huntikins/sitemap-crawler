import { EventBusChannel } from './event-bus.channel';
import type { SubscriptionCallback } from './event-bus.interface';
export class EventBus {
  private readonly _bus = new Map<string, EventBusChannel>();

  subscribe<C extends string, T extends string, D>(
    channel: C,
    topic: T,
    callback: SubscriptionCallback<D>
  ): void {
    let eventChannel = this._bus.get(channel);

    if (!eventChannel) {
      eventChannel = new EventBusChannel(channel);
      this._bus.set(channel, eventChannel);
    }

    console.log('SUBSCRIBE EVENT ==>', `${channel}:${topic}`);

    eventChannel.register(topic, callback);
  }

  publish<C extends string, T extends string, D = undefined>(
    channel: C,
    topic: T,
    datagram?: D
  ): void {
    const eventChannel = this._bus.get(channel);
    if (!eventChannel) return;

    console.log('PUBLISH EVENT ==>', `${channel}:${topic}`, datagram);

    eventChannel.callSubscribers(topic, datagram);
  }
}
