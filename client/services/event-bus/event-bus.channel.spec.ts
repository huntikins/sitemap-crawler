import { faker } from '@faker-js/faker';

import { EventBusChannel } from './event-bus.channel';

describe('Event Bus Channel', () => {
  const channelName = faker.animal.cetacean();
  const payload = {
    data: faker.animal.cetacean(),
  };

  let channel: EventBusChannel;

  beforeEach(() => {
    channel = new EventBusChannel(channelName);
  });

  describe('register', () => {
    it('should register a new topic', () => {
      const cb = vi.fn();
      const topic = faker.animal.cetacean();
      channel.register(topic, cb);
      channel.callSubscribers(topic, payload);

      expect(cb).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: payload,
        })
      );
    });
  });

  describe('callSubscribers', () => {
    it('should not call when topic has no subscribers', () => {
      expect(() => channel.callSubscribers('MISSING_TOPIC', {})).not.toThrow();
    });
  });
});
