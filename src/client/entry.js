// @ts-check
// file: src/client/entry.js

import { define } from './components/registry';
import * as count from './components/count';
import * as status from './components/status';
import * as trigger from './components/trigger';
import { makeInbound } from './app/inbound';
import { makeOutbound } from './app/outbound';
import { makeApp } from './app/index';

/** @typedef { ReturnType<typeof makeApp> } App */

function assembleApp() {
	const inbound = makeInbound('/api/counter');
	const outbound = makeOutbound('/api/increment');
	return makeApp({ inbound, outbound });
}

/** @param { App } app
 * @returns { void }
 */
function hookupUI(app) {
	define(
		count.NAME,
		count.makeSpec(app.subscribeCount, app.subscribeAvailable)
	);
	define(status.NAME, status.makeSpec(app.subscribeStatus));
	define(trigger.NAME, trigger.makeSpec(app.increment, app.subscribeAvailable));
	app.start();
}

hookupUI(assembleApp());
