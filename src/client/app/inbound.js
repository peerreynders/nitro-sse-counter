// @ts-check
// file: src/client/app/inbound.js
/** @typedef { import('../types.ts').CountEnd } CountEnd */
/** @typedef { import('../types.ts').CountError } CountError */
/** @typedef { import('../types.ts').CountMessage } CountMessage */
/** @typedef { import('../types.ts').CountUpdate } CountUpdate */
/** @typedef { import('../types.ts').Inbound } Inbound */
/** @typedef { import('../types.ts').MessageSink } MessageSink */

import { Sinks } from '../lib/sinks';

/** @typedef { EventListenerObject & {
 *   status: undefined | boolean;
 *   href: string;
 *   sinks: Sinks<CountMessage>;
 *   source: void | EventSource;
 * } } HandlerObject */

/** @type { CountEnd } */
const MESSAGE_END = {
	kind: 'end',
};

/** @type { CountError } */
const MESSAGE_ERROR = {
	kind: 'error',
	reason: 'Failed to open connection',
};

/** @param { MessageSink } send
 * @param { MessageEvent<string> } event
 */
function dispatchUpdate(send, event) {
	const count = Number(event.data);
	if (Number.isNaN(count)) return;

	/** @type { CountUpdate } */
	const message = {
		kind: 'update',
		count,
	};
	send(message);
}

/** @param { HandlerObject } router */
function disposeRouter(router) {
	if (router.source) {
		router.source.removeEventListener('message', router);
		router.source.removeEventListener('error', router);
		if (router.source.readyState < 2) router.source.close();
	}
	router.source = undefined;
	router.sinks.clear();
	router.status = false;
}

/** @param { EventSource } source
 * @param { HandlerObject } router
 */
function addRouter(source, router) {
	source.addEventListener('message', router);
	source.addEventListener('error', router);
}

/** @param { string } href
 */
function makeInbound(href) {
	/** @type { HandlerObject } */
	const eventRouter = {
		status: undefined,
		href,
		sinks: new Sinks(),
		source: undefined,
		handleEvent(event) {
			if (this.sinks.size < 1 || this.status === false) return;

			if (event instanceof MessageEvent) {
				this.status = true;
				dispatchUpdate(this.sinks.send, event);
				return;
			}

			if (event.type === 'error') {
				if (this.status === true) {
					this.sinks.send(MESSAGE_END);
				} else {
					this.sinks.send(MESSAGE_ERROR);
				}
				disposeRouter(this);
			}
		},
	};

	const start = () => {
		eventRouter.source = new EventSource(eventRouter.href);
		if (eventRouter.sinks.size > 0) {
			addRouter(eventRouter.source, eventRouter);
		}
	};

	/** @param { MessageSink } sink */
	const subscribe = (sink) => {
		const size = eventRouter.sinks.size;
		const unsubscribe = eventRouter.sinks.add(sink);
		if (size < 1 && eventRouter.source) {
			addRouter(eventRouter.source, eventRouter);
		}

		return unsubscribe;
	};

	/** @type { Inbound } */
	return {
		start,
		subscribe,
	};
}

export { makeInbound };
