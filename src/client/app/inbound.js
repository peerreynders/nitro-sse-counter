// @ts-check
// file: src/client/app/inbound.js
/** @typedef { import('../types.ts').CountEnd } CountEnd */
/** @typedef { import('../types.ts').CountError } CountError */
/** @typedef { import('../types.ts').CountMessage } CountMessage */
/** @typedef { import('../types.ts').CountUpdate } CountUpdate */
/** @typedef { import('../types.ts').Inbound } Inbound */
/** @typedef { import('../types.ts').MessageSink } MessageSink */
/** @typedef { EventListenerObject & {
 *   status: undefined | boolean;
 *   href: string;
 *   sink: void | MessageSink;
 *   source: void | EventSource;
 * } } HandlerObject */

/** @param { MessageSink } sink */
function dispatchEnd(sink) {
	/** @type { CountEnd } */
	const message = {
		kind: 'end',
	};
	sink(message);
}

/** @param { MessageSink } sink
 */
function dispatchError(sink) {
	/** @type { CountError } */
	const message = {
		kind: 'error',
		reason: 'Failed to open connection',
	};
	sink(message);
}

/** @param { MessageSink } sink
 * @param { MessageEvent<string> } event
 */
function dispatchUpdate(sink, event) {
	const count = Number(event.data);
	if (Number.isNaN(count)) return;

	/** @type { CountUpdate } */
	const message = {
		kind: 'update',
		count,
	};
	sink(message);
}

/** @param { HandlerObject } router */
function disposeRouter(router) {
	if (router.source) {
		router.source.removeEventListener('message', router);
		router.source.removeEventListener('error', router);
		if (router.source.readyState < 2) router.source.close();
	}
	router.source = undefined;
	router.sink = undefined;
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
		sink: undefined,
		source: undefined,
		handleEvent(event) {
			if (!this.sink || this.status === false) return;

			if (event instanceof MessageEvent) {
				this.status = true;
				dispatchUpdate(this.sink, event);
				return;
			}

			if (event.type === 'error') {
				if (this.status === true) {
					dispatchEnd(this.sink);
				} else {
					dispatchError(this.sink);
				}
				disposeRouter(this);
			}
		},
	};

	const start = () => {
		eventRouter.source = new EventSource(eventRouter.href);
		if (eventRouter.sink) {
			addRouter(eventRouter.source, eventRouter);
		}
	};

	/** @param { MessageSink } sink */
	const subscribe = (sink) => {
		const last = eventRouter.sink;
		eventRouter.sink = sink;
		if (!last && eventRouter.source) {
			addRouter(eventRouter.source, eventRouter);
		}

		return () => {
			if (eventRouter.sink === sink) {
				eventRouter.sink = undefined;
			}
		};
	};

	/** @type { Inbound } */
	return {
		start,
		subscribe,
	};
}

export { makeInbound };
