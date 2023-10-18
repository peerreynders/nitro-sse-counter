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
	const [disabled, wait] =
		status === availableStatus.READY
			? [false, false]
			: status === availableStatus.WAIT
			? [true, true]
			: [true, false];

	binder.root.classList.toggle(MODIFIER_WAIT, wait);

	binder.disabled = disabled;
	binder.root.classList.toggle(MODIFIER_DISABLED, disabled);
	binder.root.setAttribute('aria-disabled', String(disabled));
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
