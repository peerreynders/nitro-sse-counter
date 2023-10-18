// @ts-check
// file: src/client/components/count.ts
/** @typedef { import('../types').QsaoSpec } Spec */
/** @typedef { import('../types').AvailableSink } AvailableSink */
/** @typedef { import('../types').AvailableStatus } AvailableStatus */
/** @typedef { import('../types').CountSink } CountSink */

/** @typedef { object } Binder
 * @property { HTMLElement } root
 * @property { Text } text
 * @property { boolean } disabled
 * @property { (() => void)[] } unsubscribes
 */
import { availableStatus } from '../app/available';

const NAME = 'js\\:c-count';
const MODIFIER_DISABLED = 'js:c-count--disabled';

/** @param { Binder } binder
 * @param { AvailableStatus } status
 * @return { void }
 */
function onAvailable(binder, status) {
	const isDisabled = status === availableStatus.UNAVAILABLE;
	if (binder.disabled === isDisabled) return;

	binder.disabled = isDisabled;
	binder.root.classList.toggle(MODIFIER_DISABLED, isDisabled);
}

/** @param { Binder } binder
 * @param { number } count
 * @return { void }
 */
function onCount(binder, count) {
	if (binder.disabled) return;

	binder.text.nodeValue = String(count);
}

/** @param { Element } root
 * @return { Text }
 */
function ensureTextNode(root) {
	const first = root.firstChild;
	if (first instanceof Text) return first;

	const text = new Text('');
	if (first) {
		root.replaceChild(text, first);
	} else {
		root.appendChild(text);
	}
	return text;
}

/** @param { (fn: CountSink) => (() => void) } subscribeCount
 * @param { (fn: AvailableSink) => (() => void) } subscribeAvailable
 * @return { Spec }
 */
function makeSpec(subscribeCount, subscribeAvailable) {
	/** @type { WeakMap<Element, Binder> } */
	const instances = new WeakMap();

	/** @type { Spec } */
	const spec = {
		mounted(element) {
			if (!(element instanceof HTMLElement)) return;

			const text = ensureTextNode(element);
			/** @type { Binder } */
			const binder = {
				root: element,
				text,
				disabled: element.classList.contains(MODIFIER_DISABLED),
				unsubscribes: [],
			};
			binder.unsubscribes[0] = subscribeCount((count) =>
				onCount(binder, count)
			);
			binder.unsubscribes[1] = subscribeAvailable((status) =>
				onAvailable(binder, status)
			);

			instances.set(element, binder);
		},
		unmounted(element) {
			const instance = instances.get(element);
			if (!instance) return;

			for (const unsubscribe of instance.unsubscribes) unsubscribe();

			instances.delete(element);
		},
	};

	return spec;
}

export { NAME, makeSpec };
