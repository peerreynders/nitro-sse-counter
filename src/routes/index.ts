// file: src/routes/index.ts
import { counterRecordFromEvent } from '../server/counter';

export default defineEventHandler(async (event) => {
	const title = 'SSE Counter';
	const record = await counterRecordFromEvent(event);
	const count = record ? String(record.count) : '&nbsp;';

	// prettier-ignore
	return (
		'<!doctype html><html lang="en"><head>' +
			'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
			`<title>Nitro - ${title}</title>` +
			'<link rel="icon" href="favicon.ico">' +
			'<link href="https://fonts.googleapis.com/css?family=IBM+Plex+Sans:400,600&amp;display=swap" rel="stylesheet">' +
			'<link rel="stylesheet" href="styles.css">' +
			'<script type="module" src="main.js"></script>' +
		'</head><body>' +
			`<h1>${title}</h1>` +
			'<div class="c-counter">' +
				'<dl>' +
					'<dt>Count</dt>' +
					`<dd aria-live="assertive" aria-disabled="false" class="c-counter__count js:c-count">${count}</dd>` +
				'</dl>' +
				'<div class="c-counter__increment">' +
					'<button class="js:c-trigger c-counter__button">Increment</button>' +
					'<p aria-live="assertive" class="js:c-status c-counter__status"></p>' +
				'</div>' +
			'</div>' +
			'<footer>' +
				'<div class="center">' +
					'<p>Served with <a href="https://unjs.io/">UnJS</a> <a href="https://nitro.unjs.io/">Nitro</a>.</p>' +
					'<p>Frontend' +
						'<ul>' +
							'<li>Using <a href="https://github.com/WebReflection/qsa-observer">qsa-observer</a></li>' +
							'<li>Type checked with ' +
								'<a href="https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html">TS JSDoc</a>.' +
							'</li>' +
							'<li>Bundled with <a href="https://rollupjs.org/">Rollup</a>.</li>' +
							'<li>Design repurposed from <a href="https://codepen.io/sandrina-p/pen/WNRYabB">here</a>.</li>' +
							'<li>CSS reset from <a href="https://andy-bell.co.uk/a-more-modern-css-reset/">here</a>.</li>' +
						'</ul>' +
					'</p>' +
				'</div>' +
			'</footer>' +
		'</body></html>'
	);
});
