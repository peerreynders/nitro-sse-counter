// @ts-check
// file: src/client/components/status.ts
/** @typedef { import('../types').QsaoSpec } Spec */
/** @typedef { import('../types').Status } Status */
/** @typedef { import('../types').StatusSink } StatusSink */

/** @typedef { object } Binder
 * @property { HTMLParagraphElement } root
 * @property { Text } text
 * @property { () => void } unsubscribe
 */

const NAME = 'js\\:c-status';
const MODIFIER_ERROR = 'js:c-status--error';
const noOp = () => {};

/** @param { Binder } binder
 * @param { Status } status
 * @return { void }
 */
function onStatus(binder, status) {
	binder.root.classList.toggle(MODIFIER_ERROR, status.error);
	binder.text.nodeValue = status.message;
}

/** @param { (fn: StatusSink) => (() => void) } subscribe
 * @return { Spec }
 */
function makeSpec(subscribe) {
	/** @type { WeakMap<Element, Binder> } */
	const instances = new WeakMap();

	/** @type { Spec } */
	const spec = {
		mounted(element) {
			if (!(element instanceof HTMLParagraphElement)) return;

			const binder = {
				root: element,
				text: new Text(''),
				unsubscribe: noOp,
			};
			binder.root.appendChild(binder.text);
			binder.unsubscribe = subscribe((status) => onStatus(binder, status));

			instances.set(element, binder);
		},
		unmounted(element) {
			const instance = instances.get(element);
			if (!instance) return;

			instance.unsubscribe();
			instances.delete(element);
		},
	};

	return spec;
}

export { NAME, makeSpec };
