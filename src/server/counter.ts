import type { EventHandlerRequest, H3Event } from 'h3';

type RequestEvent = H3Event<EventHandlerRequest>;

export type CountDispatch = (count: number, id: string) => void;

export type CounterRecord = {
	id: string;
	lastEventId: string;
	count: number;
	observers: number;
};

const CONTEXT_COUNTER = 'counter';
const STORAGE_COUNTER = 'counter';

const makeCounterRecord = (id: string, lastEventId: string): CounterRecord => ({
	id,
	lastEventId,
	count: 0,
	observers: 0,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tap = <T>(name: string, x: T): T => (console.log(name, x), x);

// inferred return type should also included `null`
const counterRecord = (id: string): Promise<void | CounterRecord> =>
	useStorage(STORAGE_COUNTER).getItem<CounterRecord>(id);

const removeRecord = (id: string) => useStorage(STORAGE_COUNTER).removeItem(id);

const updateRecord = (record: CounterRecord) =>
	useStorage(STORAGE_COUNTER).setItem<CounterRecord>(record.id, record);

function counterRecordFromEvent(event: RequestEvent) {
	const id = event.context[CONTEXT_COUNTER];
	if (typeof id !== 'string') return undefined;

	return counterRecord(id);
}

// inferred return type should also included `undefined`
async function increment(id: string): Promise<void | CounterRecord> {
	const record = (await counterRecord(id)) ?? undefined;
	if (!record) return undefined;

	record.count += 1;
	record.lastEventId = String(Date.now());
	await updateRecord(record);
	return record;
}

async function addObserver(
	event: RequestEvent,
	refreshId: (event: RequestEvent) => Promise<string>
) {
	let record = (await counterRecordFromEvent(event)) ?? undefined;

	if (!record) {
		const id = await refreshId(event);
		record = makeCounterRecord(id, String(Date.now()));
	}

	record.observers += 1;
	await updateRecord(record);

	return record;
}

// inferred return type should also included `undefined`
async function dropObserver(id: string): Promise<void | CounterRecord> {
	const record = (await counterRecord(id)) ?? undefined;
	if (!record) return undefined;

	if (record.observers < 2) {
		await removeRecord(record.id);
		return undefined;
	}

	record.observers -= 1;
	await updateRecord(record);

	return record;
}

export {
	CONTEXT_COUNTER,
	addObserver,
	counterRecordFromEvent,
	dropObserver,
	increment,
};
