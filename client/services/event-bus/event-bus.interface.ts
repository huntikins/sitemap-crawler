export type SubscriptionCallback<T> = (datagram: PublishDatagram<T>) => void;
export type ChannelTopics<D> = Map<symbol, BusDatagram<D>>;

export interface BusDatagram<T> {
  callback: SubscriptionCallback<T>;
  data: SubscribeDatagram;
}

export interface SubscribeDatagram {
  id: symbol;
  channel: string;
  topic: string;
}

export interface PublishDatagram<T> extends SubscribeDatagram {
  payload: T;
}

export interface ClientMessage<T> {
  pluginMessage: {
    channel: string;
    topic: string;
    payload?: T;
  };
}

export interface ClientPayload<T> {
  topic: string;
  channel: string;
  data?: T;
}
