# nitro-sse-counter
SSE POC with UnJS Nitro and a TS JSDoc frontend

## Server

### Features

- [Middleware](https://nitro.unjs.io/guide/routing#route-middleware) transferring common values from request to [`H3EventContext`](https://www.jsdocs.io/package/h3#H3EventContext).
- [Session](https://www.jsdocs.io/package/h3#Session) cookies with [h3](https://github.com/unjs/h3).
- Shared [data](src/server/counter.ts) managed in server ([memory](https://unstorage.unjs.io/drivers/memory)) [storage](https://nitro.unjs.io/guide/storage) with [Unstorage](https://unstorage.unjs.io/).
- Client specific event dispatchers related to shared server data [managed](src/utils/hooks.ts) with [hooks](https://github.com/unjs/hookable).

### Server to client communication

Though not strictly necessary a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) is returned in the [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) ([features](https://www.smashingmagazine.com/2018/02/sse-websockets-data-flow-http2/#unique-features)) response to carry the events from the server to the client. The `ReadableStream` is a web standard API and the event stream (mostly) decouples it from the [node specific request API](https://nodejs.org/api/http.html#class-httpincomingmessage).

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

### SSE Connection Endpoint

The event handler increments the observer count on the counter record. 
The initialization function registers the client event dispatch with the server counter hooks an submits a task to (eventually) send this client the most current count.

The cleanup function is responsible for unregistering the client event dispatch and adjusting the observer count (potentially dropping the counter record).
The cleanup is called when the event stream is closed by either the server or client. 

```TypeScript
// file: src/api/counter.ts
import { CONTEXT_SESSION_ID, refreshCounterId } from '../server/session';
import { makeEventStream, type SourceController } from '../server/event-stream';
import { submitTask } from '../server/task-queue';
import {
	addObserver,
	dropObserver,
	type CountDispatch,
	type CounterRecord,
} from '../server/counter';

function submitCountUnicast(record: CounterRecord, dispatch: CountDispatch) {
	const task = () => {
		dispatch(record.count, record.lastEventId);
	};

	// ejectable by non-ejectable task
	// with same priority (counter) id
	//   i.e. the `increment` will notify the observer
	//   of the latest value already
	//
	submitTask(task, record.id, true);
}

function makeInitFn(record: CounterRecord, sessionId: string) {
	return function init(controller: SourceController) {
		const { send, close } = controller;
		const dispatch = (count: number, id: string) => {
			send(String(count), id);
			if (count > 9) close();
		};
		const unsubscribe = counterHooks.hook(record.id, dispatch);
		submitCountUnicast(record, dispatch);

		return function cleanup() {
			unsubscribe();
			dropObserver(record.id, sessionId);
		};
	};
}

export default defineEventHandler(async (event) => {
	const record = await addObserver(event, refreshCounterId);
	const sessionId = event.context[CONTEXT_SESSION_ID] as string;
	const init = makeInitFn(record, sessionId);

	setHeader(event, 'cache-control', 'no-cache');
	setHeader(event, 'connection', 'keep-alive');
	setHeader(event, 'content-type', 'text/event-stream');
	setResponseStatus(event, 200);

	return makeEventStream(event.node.req, init);
});
```

### Session

The session correlates the client to the counter record maintained by the server.
While the counter record is dropped when the last observer closes, the session persist as it may not be possible to update/remove the session cookie on the client at that time.
However when a new record is initialized, the a cookie is updated with a different counter ID.
The session ID is separate from the counter ID; the session record only holds the counter ID needed access the counter record. 

```TypeScript
// file: src/server/session.ts
import crypto from 'uncrypto';
import { updateSession, getSession, type SessionConfig } from 'h3';

import type { EventHandlerRequest, H3Event } from 'h3';

type SessionRecord = {
  counterId: string;
};

const CONTEXT_SESSION_ID = 'session-id';

if (!process.env.SESSION_SECRET) throw Error('SESSION_SECRET must be set');

const config: SessionConfig = {
  cookie: {
    // domain?: string
    // encode?: (value: string) => string;
    // expires?: Date
    httpOnly: true,
    // maxAge?: number
    path: '/',
    sameSite: 'lax',
    secure: true,
  },
  password: process.env.SESSION_SECRET,
  maxAge: 86400, // 24h
  name: '__session',
};

// Note: Despite type, `session.data` may not have `id` property
const sessionFromEvent = (event: H3Event<EventHandlerRequest>) =>
  getSession<SessionRecord>(event, config);

async function refreshCounterId(event: H3Event<EventHandlerRequest>) {
  const counterId = crypto.randomUUID();
  await updateSession(event, config, { counterId });
  return counterId;
}

export { CONTEXT_SESSION_ID, refreshCounterId, sessionFromEvent };
```

Middleware is responsible for creating the session cookie and transferring some request data to the event context.

```TypeScript
// file: src/middleware/1.session.ts
import { CONTEXT_COUNTER } from '../server/counter';
import { CONTEXT_SESSION_ID, sessionFromEvent } from '../server/session';
import { CONTEXT_URL, urlFromRequest } from '../server/url';

export default defineEventHandler(async (event) => {
  const url = urlFromRequest(event.node.req);
  if (url) event.context[CONTEXT_URL] = url;

  const session = await sessionFromEvent(event);
  event.context[CONTEXT_SESSION_ID] = session.id;
  const record = session.data;
  if (record) event.context[CONTEXT_COUNTER] = record.counterId;
});
```

### Task Queue

The task queue manages the event dispatches. 
It is used to eject redundant tasks, i.e. a unicast count update is redundant if an increment to the respective counter is already scheduled or will be scheduled before the entire queue of tasks is run.

For the **same counter** the increment task is considered non-ejectable while a unicast update is ejectable. 
An increment task increments the counter record and notifies all active observers of that record. A unicast update is the initial observer specific event that just communicates the current counter value. 

- An ejectable task can be added as long as no task or only ejectable tasks are on the queue.
- Queuing a **non-ejectable** task will cause all ejectable tasks on the queue to be ejected. 
- Once a **non-ejectable** task is on the queue no other other tasks, ejectable or **non-ejectable**, can be queued until the all the tasks on the queue have run.

The tasks are managed with respect to a priority ID. In this case the counter ID serves as the priority ID.

All active ejectable tasks are on the `taskQueue`. 
The first ejectable `TaskRecord` (for a specific `priorityId`) in the queue acts as the head of a linked list of all ejectable tasks for that particular `priorityId`.
The linked list is traversed when all the ejectable tasks are ejected.
`priorityMap` acts a an index by `priorityId` into the `taskQueue`; it indexes only **non-ejectable** `TaskRecords`s or any ejectable `TaskRecord`s at the head of their respective linked lists. 

```TypeScript
// file: src/server/task-queue.ts
type TaskRecord = {
  task: () => void;
  priorityId: string | undefined;
  eject: boolean;
  next: TaskRecord | undefined;
};

type PriorityMap = Map<string, TaskRecord>;

const RUN_DELAY = 300;

const makeTaskRecord = (
  task: () => void,
  priorityId?: string,
  eject: boolean = false
) => ({ task, priorityId, eject, next: undefined });

let queuedId: ReturnType<typeof setTimeout> | undefined;
const taskQueue: TaskRecord[] = [];

const priorityMap: PriorityMap = new Map();

// Process **everything** on the queue
function runQueue() {
  priorityMap.clear();
  for (let i = 0; i < taskQueue.length; i += 1) taskQueue[i].task();

  taskQueue.length = 0;
  queuedId = undefined;
}

function queueTask(record: TaskRecord) {
  taskQueue.push(record);

  if (typeof queuedId !== 'undefined') return;
  queuedId = setTimeout(runQueue, RUN_DELAY);
}

// For non-ejectable or first ejectable tasks
function queueTaskWithId(record: TaskRecord) {
  priorityMap.set(record.priorityId, record);
  queueTask(record);
}

// For ejectable tasks after the first
function appendEjectable(head: TaskRecord, last: TaskRecord) {
  let record = head;
  for (; record.next; record = record.next);
  record.next = last;

  queueTask(record);
}

function ejectTasks(record: TaskRecord) {
  for (let next = record; next; next = record.next) {
    const index = taskQueue.indexOf(next);
    if (index > -1) taskQueue.splice(index, 1);
  }
}

function submitTask(
  task: () => void,
  priorityId?: string,
  eject: boolean = false
) {
  if (typeof priorityId === 'undefined') {
    queueTask(makeTaskRecord(task));
    return;
  }

  const found = priorityMap.get(priorityId);
  if (!found) {
    queueTaskWithId(makeTaskRecord(task, priorityId, eject));
    return;
  }

  if (!found.eject) {
    // found task will take care of it
    return;
  }

  const record = makeTaskRecord(task, priorityId, eject);

  if (record.eject) {
    appendEjectable(found, record);
    return;
  }

  // new task will replace ejectables
  ejectTasks(found);
  queueTaskWithId(record);
}

export { submitTask };
```

### Counter Management

The `CounterRecords` are managed with the nitro [storage layer](https://nitro.unjs.io/guide/storage) using the default [Unstorage](https://unstorage.unjs.io/) memory [driver](https://unstorage.unjs.io/drivers/memory).

The module exports:
- `addObserver` adds a new `CounterRecord` when there is no counter with a matching `counterId`; otherwise it increments the observer count and updates the stored `CounterRecord`.
-

```TypeScript
// file: src/server/counter.ts
import { CONTEXT_SESSION_ID } from './session';

import type { EventHandlerRequest, H3Event } from 'h3';

type RequestEvent = H3Event<EventHandlerRequest>;

export type CountDispatch = (count: number, id: string) => void;

export type CounterRecord = {
  id: string;
  lastEventId: string;
  count: number;
  observers: number;
};

type TaskRecord = {
  id: string;
  task: () => Promise<void>;
};

// --- Task Queue
const taskQueue: TaskRecord[] = [];

const locate = new (class {
  id = '';
  readonly withId = (record: TaskRecord) => this.id === record.id;
  readonly countWithId = (count: number, record: TaskRecord) =>
    this.id === record.id ? count + 1 : count;
})();

// Continue running until there are no more tasks with the same
// session IDs in taskQueue
async function runTasks(record: TaskRecord) {
  for (
    ;
    typeof record !== 'undefined';
    record = taskQueue.find(locate.withId)
  ) {
    await record.task();

    const index = taskQueue.indexOf(record);
    taskQueue.splice(index, 1);
    locate.id = record.id;
  }
}

function queueTask(record: TaskRecord) {
  locate.id = record.id;
  const count = taskQueue.reduce(locate.countWithId, 0);
  taskQueue.push(record);

  // Others with identical session ID already running
  if (count > 0) return;

  runTasks(record);
}

// --- Storage Tnteraction
//
const CONTEXT_COUNTER = 'counter';
const STORAGE_COUNTER = 'counter';

const makeCounterRecord = (id: string, lastEventId: string): CounterRecord => ({
  id,
  lastEventId,
  count: 0,
  observers: 1,
});

// inferred return type should also included `undefined`
async function counterRecord(id: unknown): Promise<CounterRecord | void> {
  if (typeof id !== 'string') return undefined;

  return (
    (await useStorage(STORAGE_COUNTER).getItem<CounterRecord>(id)) ?? undefined
  );
}

const removeRecord = (id: string) => useStorage(STORAGE_COUNTER).removeItem(id);

const updateRecord = (record: CounterRecord) =>
  useStorage(STORAGE_COUNTER).setItem<CounterRecord>(record.id, record);

// --- Tasks
//
function counterRecordFromEvent(event: RequestEvent) {
  const id = event.context[CONTEXT_SESSION_ID];
  const counterId = event.context[CONTEXT_COUNTER];
  return new Promise<CounterRecord | void>((resolve, reject) => {
    const task = async () => {
      try {
        const record = await counterRecord(counterId);
        return resolve(record);
      } catch (error) {
        reject(error);
      }
    };

    queueTask({ id, task });
  });
}

function increment(event: RequestEvent) {
  const id = event.context[CONTEXT_SESSION_ID];
  const counterId = event.context[CONTEXT_COUNTER];
  return new Promise<CounterRecord | void>((resolve, reject) => {
    const task = async () => {
      try {
        const record = await counterRecord(counterId);
        if (!record) return resolve(undefined);

        record.count += 1;
        record.lastEventId = String(Date.now());
        await updateRecord(record);
        return resolve(record);
      } catch (error) {
        reject(error);
      }
    };

    queueTask({ id, task });
  });
}

function addObserver(
  event: RequestEvent,
  refreshId: (event: RequestEvent) => Promise<string>
) {
  const id = event.context[CONTEXT_SESSION_ID];
  const counterId = event.context[CONTEXT_COUNTER];
  return new Promise<CounterRecord>((resolve, reject) => {
    const task = async () => {
      try {
        let record = await counterRecord(counterId);
        if (record) {
          record.observers += 1;
        } else {
          const freshId = await refreshId(event);
          record = makeCounterRecord(freshId, String(Date.now()));
        }

        await updateRecord(record);
        return resolve(record);
      } catch (error) {
        reject(error);
      }
    };

    queueTask({ id, task });
  });
}

function dropObserver(counterId: string, id: string) {
  return new Promise<CounterRecord | void>((resolve, reject) => {
    const task = async () => {
      try {
        const record = await counterRecord(counterId);
        if (!record) return resolve(undefined);

        if (record.observers < 2) {
          await removeRecord(record.id);
          return resolve(undefined);
        }

        record.observers -= 1;
        await updateRecord(record);

        return resolve(record);
      } catch (error) {
        reject(error);
      }
    };

    queueTask({ id, task });
  });
}

export {
  CONTEXT_COUNTER,
  addObserver,
  counterRecordFromEvent,
  dropObserver,
  increment,
};
```

Every export in the `utils` directory or its subdirectories [becomes available globally](). So `counterHooks` is avaialble throughpout the server.

```TypeScript
// file: src/utils/hooks.ts
import { createHooks } from 'hookable';
import type { CountDispatch } from '../server/counter';

export interface CounterHooks {
	[key: string]: CountDispatch;
}

export const counterHooks = createHooks<CounterHooks>();
```

---

… under construction … 
