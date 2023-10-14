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
