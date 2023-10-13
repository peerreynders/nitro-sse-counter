// file: src/client/index.d.ts
declare module 'qsa-observer' {
	export interface QsaoOptions {
		query: string[];
		root: Node;
		handle(element: Element, connected: boolean, selector: string): void;
	}

	export interface QsaoReturn {
		drop(elements: ArrayLike<Element>): void;
		flush(): void;
		observer: MutationObserver;
		parse(elements: ArrayLike<Element>, mounted?: boolean): void;
	}

	export default function (options: QsaoOptions): QsaoReturn;
}
