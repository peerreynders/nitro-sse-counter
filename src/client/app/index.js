// @ts-check
// file: src/client/app/index.js
/** @typedef { import('../types').CountSink } CountSink */
/** @typedef { import('../types').AvailableStatus } AvailableStatus */
/** @typedef { import('../types').AvailableSink } AvailableSink */
/** @typedef { import('../types').CountMessage } Message */
/** @typedef { import('../types').Inbound } Inbound */
/** @typedef { import('../types').Outbound } Outbound */
/** @typedef { import('../types').Status } Status */
/** @typedef { import('../types').StatusSink } StatusSink */

import { Sinks } from '../lib/sinks';
import { availableStatus } from './available';

/** @param { StatusSink } sendStatus */
function makeContext(sendStatus) {
	/** @type { Status | undefined } */
	let status = {
		error: true,
		message: 'Connection failed. Reload to retry.',
	};
	// Once status is undefined we're done

	/** @type { Sinks<AvailableStatus> } */
	const sinks = new Sinks();

	const context = {
		/** @type { AvailableStatus } */
		available: availableStatus.READY,

		/** @param { Message } message */
		messageSink: (message) => {
			switch (message.kind) {
				case 'end': {
					status = {
						error: false,
						message: 'Count complete. Reload to restart.',
					};
					break;
				}

				case 'error':
					break;

				default:
					return;
			}

			context.sendAvailable(availableStatus.UNAVAILABLE);
		},

		/** @param { AvailableStatus } available
		 */
		sendAvailable: (available) => {
			if (!status) return;

			context.available = available;
			sinks.send(available);

			if (available === availableStatus.UNAVAILABLE) {
				sendStatus(status);
				status = undefined;
			}
		},

		/** @param { AvailableSink } sink
		 */
		subscribe: (sink) => {
			const unsubscribe = sinks.add(sink);
			sink(context.available);
			return unsubscribe;
		},
	};

	return context;
}

/** @param { Inbound['subscribe'] } subscribe
 * @param { (message: Message) => void } messageSink
 * @param { AvailableSink } sendAvailable
 */
function makeCount(subscribe, messageSink, sendAvailable) {
	/** @type { CountSink | undefined } */
	let sink;
	/** @type { (() => void) | undefined } */
	let unsubscribe;

	/** @param { Message } message */
	const handler = (message) => {
		switch (message.kind) {
			case 'update': {
				if (sink) {
					sink(message.count);
				}
				sendAvailable(availableStatus.READY);
				return;
			}

			case 'error':
			case 'end': {
				if (unsubscribe) unsubscribe();
				messageSink(message);
				return;
			}
		}
	};

	const count = {
		/** @param { CountSink } nextSink
		 * @return { () => void }
		 */
		subscribe: (nextSink) => {
			sink = nextSink;
			return () => {
				if (sink === nextSink) sink = undefined;
			};
		},

		/** @type { (() => void) | undefined } */
		unsubscribe: (() => {
			const removeHandler = subscribe(handler);
			const dispose = () => {
				count.unsubscribe = unsubscribe = undefined;
				removeHandler();
			};
			return dispose;
		})(),
	};

	return count;
}

/** @param { () => Promise<boolean> } incrementFn
 * @param { AvailableSink } sendAvailable
 */
function makeIncrement(incrementFn, sendAvailable) {
	/** @param { boolean } accepted */
	const postIncrement = (accepted) => {
		if (accepted) return;

		sendAvailable(availableStatus.UNAVAILABLE);
	};

	let done = false;

	const increment = {
		/** @type { AvailableSink } */
		availableSink: (available) => {
			if (done) return;

			if (available === availableStatus.UNAVAILABLE) done = true;
		},

		/** @type { undefined | (() => void)} */
		unsubscribe: undefined,

		dispatch() {
			if (done) return;

			sendAvailable(availableStatus.WAIT);
			incrementFn().then(postIncrement);
		},
	};

	return increment;
}

function makeStatus() {
	/** @type { undefined | StatusSink } */
	let sink;

	const status = {
		/** @param { Status} message
		 * @return { void }
		 */
		send: (message) => {
			if (sink) sink(message);
		},

		/** @param { StatusSink } nextSink
		 * @return { () => void }
		 */
		subscribe: (nextSink) => {
			sink = nextSink;
			return () => {
				if (sink === nextSink) sink = undefined;
			};
		},
	};

	return status;
}

/** @param { {
 *   inbound: Inbound
 *   outbound: Outbound
 * } } api
 */
function makeApp({ inbound, outbound }) {
	const status = makeStatus();
	const context = makeContext(status.send);
	const count = makeCount(
		inbound.subscribe,
		context.messageSink,
		context.sendAvailable
	);
	const increment = makeIncrement(outbound.increment, context.sendAvailable);

	// Internal registrations
	increment.unsubscribe = context.subscribe(increment.availableSink);

	return {
		increment: increment.dispatch,
		start: inbound.start,
		subscribeAvailable: context.subscribe,
		subscribeStatus: status.subscribe,
		subscribeCount: count.subscribe,
	};
}

export { makeApp };
