// file: src/api/increment.post.ts
import { submitTask } from '../server/task-queue';
import {
	counterRecordFromEvent,
	increment,
	type CounterRecord,
} from '../server/counter';

import type { EventHandlerRequest, H3Event } from 'h3';

function notifyObservers(record: void | CounterRecord) {
	if (!record) return;

	counterHooks.callHook(record.id, record.count, record.lastEventId);
}

const makeUpdateBroadcast = (event: H3Event<EventHandlerRequest>) => () =>
	increment(event).then(notifyObservers);

export default defineEventHandler(async (event) => {
	const record = await counterRecordFromEvent(event);
	if (!record) {
		sendNoContent(event, 409);
		return;
	}

	// non-ejectable, non-duplicated task
	submitTask(makeUpdateBroadcast(event), record.id);
	sendNoContent(event, 202);
});
