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
