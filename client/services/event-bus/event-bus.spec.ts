import { faker } from '@faker-js/faker';

import { EventBusChannel } from './event-bus.channel';
import { EventBus } from './event-bus.service';

describe('Event Bus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should create a new channel', () => {
    const channel = faker.animal.cetacean();
    const topic = faker.animal.cetacean();
    const callback = vi.fn();

    const registerSpy = vi.spyOn(EventBusChannel.prototype, 'register');

    bus.subscribe(channel, topic, callback);

    expect(registerSpy).toHaveBeenCalledWith(topic, callback);
  });

  it('should reuse an existing channel', () => {
    const channel = faker.animal.cetacean();
    const topic = faker.animal.cetacean();
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const registerSpy = vi.spyOn(EventBusChannel.prototype, 'register');

    bus.subscribe(channel, topic, callback1);
    bus.subscribe(channel, topic, callback2);

    expect(registerSpy).toHaveBeenCalledWith(topic, callback1);
    expect(registerSpy).toHaveBeenCalledWith(topic, callback2);
  });

  describe('publish', () => {
    it('should trigger the callback when called', () => {
      const channel = faker.animal.cetacean();
      const topic = faker.animal.cetacean();
      const datagram = {};
      const callback = vi.fn();
      const callSubscriberSpy = vi.spyOn(
        EventBusChannel.prototype,
        'callSubscribers'
      );

      bus.subscribe(channel, topic, callback);
      bus.publish(channel, topic, datagram);

      expect(callSubscriberSpy).toHaveBeenCalledWith(topic, datagram);
    });

    it('should exit function if channel does not exist', () => {
      const channel = faker.animal.cetacean();
      const topic = faker.animal.cetacean();
      const datagram = {};
      const callback = vi.fn();
      const callSubscriberSpy = vi.spyOn(
        EventBusChannel.prototype,
        'callSubscribers'
      );

      bus.subscribe(channel, topic, callback);
      bus.publish(faker.animal.crocodilia(), topic, datagram);

      expect(callSubscriberSpy).not.toHaveBeenCalled();
    });
  });
});
