// @ts-check
import Qsao from 'qsa-observer';

/** @typedef { import('../types').QsaoSpec } Spec */

// set up component registry
/**  @type { Map<string, Spec> } */
const registry = new Map();
/** @type { string[] } */
const query = [];
const root = self.document;
const qsao = Qsao({
	query,
	root,
	handle(element, mounted, selector) {
		const spec = registry.get(selector);
		if (!spec) return;

		(mounted ? spec.mounted : spec.unmounted)?.(element);
	},
});

/** @param { string} name
 * @param { Spec } spec
 * @return { void }
 */
const define = (name, spec) => {
	const selector = '.' + name;
	if (query.includes(selector)) return;

	query.push(selector);
	registry.set(selector, spec);
	qsao.parse(root.querySelectorAll(selector));
};

export { define };
