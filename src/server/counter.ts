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
