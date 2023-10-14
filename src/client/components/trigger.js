// @ts-check
// file: src/client/components/trigger.ts
/** @typedef { import('../types').QsaoSpec } Spec */
/** @typedef { import('../types').AvailableStatus } AvailableStatus */
/** @typedef { import('../types').AvailableSink } AvailableSink */

/** @typedef { object } Binder
 * @property { HTMLButtonElement } root
 * @property { boolean } disabled
 * @property { () => void } click
 * @property { () => void } unsubscribe
 */
import { availableStatus } from '../app/available';

const NAME = 'js\\:c-trigger';
const MODIFIER_DISABLED = 'js:c-trigger--disabled';
const MODIFIER_WAIT = 'js:c-trigger--wait';
const noOp = () => {};

/** @param { Binder } binder
 * @param { AvailableStatus } status
 * @return { void }
 */
function onAvailable(binder, status) {
	switch (status) {
		case availableStatus.UNAVAILABLE: {
			binder.root.classList.remove(MODIFIER_WAIT);

			binder.disabled = true;
			binder.root.classList.add(MODIFIER_DISABLED);
			binder.root.setAttribute('aria-disabled', 'true');
			return;
		}

		case availableStatus.WAIT: {
			binder.root.classList.add(MODIFIER_WAIT);

			binder.disabled = true;
			binder.root.classList.add(MODIFIER_DISABLED);
			binder.root.setAttribute('aria-disabled', 'true');
			return;
		}

		default: {
			binder.root.classList.remove(MODIFIER_WAIT);

			binder.disabled = false;
			binder.root.classList.remove(MODIFIER_DISABLED);
			binder.root.removeAttribute('aria-disabled');
			return;
		}
	}
}

/** @param { () => void } action
 * @param { (fn: AvailableSink) => (() => void) } subscribe
 * @return { Spec }
 */
function makeSpec(action, subscribe) {
	/** @type { WeakMap<Element, Binder> } */
	const instances = new WeakMap();

	/** @type { Spec } */
	const spec = {
		mounted(element) {
			if (!(element instanceof HTMLButtonElement)) return;

			const binder = {
				root: element,
				disabled: false,
				click: () => {
					if (binder.disabled) return;

					action();
				},
				unsubscribe: noOp,
			};
			binder.unsubscribe = subscribe((status) => onAvailable(binder, status));
			instances.set(element, binder);
			binder.root.addEventListener('click', binder.click);
		},
		unmounted(element) {
			const instance = instances.get(element);
			if (!instance) return;

			instance.unsubscribe();
			instance.root.removeEventListener('click', instance.click);
			instances.delete(element);
		},
	};

	return spec;
}

export { NAME, makeSpec };
