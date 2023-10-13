import { createHooks } from 'hookable';
import type { CountDispatch } from '../server/counter';

export interface CounterHooks {
	[key: string]: CountDispatch;
}

export const counterHooks = createHooks<CounterHooks>();
