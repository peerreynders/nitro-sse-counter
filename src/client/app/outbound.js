// @ts-check
// file: src/client/app/outbound.js

/** @param { string } href
 */
function makeOutbound(href) {
	const increment = async () => {
		const response = await fetch(href, { method: 'POST' });
		return response.ok;
	};

	return {
		increment,
	};
}

export { makeOutbound };
