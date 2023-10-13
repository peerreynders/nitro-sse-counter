import crypto from 'uncrypto';
import { updateSession, getSession, type SessionConfig } from 'h3';

import type { EventHandlerRequest, H3Event } from 'h3';

type SessionRecord = {
	counterId: string;
};

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

export { refreshCounterId, sessionFromEvent };
