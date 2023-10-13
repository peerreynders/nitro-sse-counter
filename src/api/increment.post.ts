// file: src/api/increment.post.ts
import { submitTask } from '../server/task-queue';
import {
	counterRecordFromEvent,
	increment,
	type CounterRecord,
} from '../server/counter';

function notifyObservers(record: void | CounterRecord) {
	if (!record) return;

	counterHooks.callHook(record.id, record.count, record.lastEventId);
}

const makeUpdateBroadcast = (counterId: string) => () =>
	increment(counterId).then(notifyObservers);

export default defineEventHandler(async (event) => {
	const record = (await counterRecordFromEvent(event)) ?? undefined;

	if (!record) {
		sendNoContent(event, 409);
		return;
	}

	// non-ejectable, non-duplicated task
	submitTask(makeUpdateBroadcast(record.id), record.id);
	sendNoContent(event, 202);
});
