import { URL } from 'node:url';

import type { IncomingMessage } from 'node:http';

const CONTEXT_URL = 'url';

function urlFromRequest(request: IncomingMessage) {
	const scheme = 'getPeerCertificate' in request.socket ? 'https' : 'http';
	const baseUrl = `${scheme}://${request.headers.host}`;

	return URL.canParse(request.url, baseUrl)
		? new URL(request.url, baseUrl)
		: undefined;
}

export { CONTEXT_URL, urlFromRequest };
