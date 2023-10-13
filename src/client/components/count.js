// @ts-check
// file: src/client/components/status.ts
/** @typedef { import('../types').QsaoSpec } Spec */
/** @typedef { import('../types').AvailableSink } AvailableSink */
/** @typedef { import('../types').AvailableStatus } AvailableStatus */
/** @typedef { import('../types').CountSink } CountSink */

/** @typedef { object } Binder
 * @property { HTMLElement } root
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
	switch (status) {
		case availableStatus.UNAVAILABLE: {
			if (!binder.disabled) {
				binder.disabled = true;
				binder.root.classList.add(MODIFIER_DISABLED);
			}
			return;
		}

		default: {
			if (binder.disabled) {
				binder.disabled = false;
				binder.root.classList.remove(MODIFIER_DISABLED);
			}
			return;
		}
	}
}

/** @param { Binder } binder
 * @param { number } count
 * @return { void }
 */
function onCount(binder, count) {
	binder.root.textContent = String(count);
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

			/** @type { Binder } */
			const binder = {
				root: element,
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
