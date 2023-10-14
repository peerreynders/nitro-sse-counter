# nitro-sse-counter
SSE POC with UnJS Nitro and a TS JSDoc frontend

## Server

[`event-stream.ts`](src/server/event-stream.ts)—though not strictly necessary a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) is at core of the server-sent events response.

```TypeScript
// file: src/server/event-stream.ts
import { IncomingMessage } from 'node:http';
import { ReadableStream } from 'node:stream/web';
import { TextEncoder } from 'node:util';

export type SourceController = {
  send: (data: string, id?: string) => void;
  close: () => void;
};

type InitSource = (controller: SourceController) => () => void;

function makeEventStream(request: IncomingMessage, init: InitSource) {
  // listen to the request closing ASAP
  let cleanup: (() => void) | undefined;
  let closeStream: (() => void) | undefined;
  let onClientClose = () => {
    if (onClientClose) {
      request.removeListener('close', onClientClose);
      onClientClose = undefined;
    }
    closeStream?.();
  };
  request.addListener('close', onClientClose);

  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string, id?: string) => {
        const payload = (id ? 'id:' + id + '\ndata:' : 'data:') + data + '\n\n';
        controller.enqueue(encoder.encode(payload));
      };

      closeStream = () => {
        if (!cleanup) return;

        cleanup();
        cleanup = undefined;
        controller.close();
      };
      cleanup = init({ send, close: closeStream });

      if (!onClientClose) {
        // client closed request early
        closeStream();
        return;
      }
    },
  });
}

export { makeEventStream };
```
