import mitt from 'mitt';

const emitter = mitt();

export function eventOn(type: string, listener: (event: unknown) => void): () => void {
  emitter.on(type, listener);
  return () => emitter.off(type, listener);
}

export function eventEmit(type: string, event: unknown) {
  emitter.emit(type, event);
}

export default emitter;