import { AppEvents } from './AppEvents';

const emitter = AppEvents.Instance;

interface PublishToListeners {
    topic: string;
    data: any;
}

export const publishDataToTopic = (args: PublishToListeners): boolean => {
    const { topic, data } = args;
    return emitter.emit(topic, data)
}
