// file: src/client/types.ts
import { makeApp } from './app/index';
import { availableStatus } from './app/available';
/*
	A specification object
	(https://gist.github.com/benpriebe/55b7e950b5e9d056b47e?permalink_comment_id=2229105#gistcomment-2229105)
	is a configurations/customizations "bag" that is passed
	to a factory or builder function to configure and/or
	customize the item under assembly.

	Douglas Crockford also called them _Object Specifiers_
       in _JavaScript: The Good Parts_.

	The term was also used in the original
	(https://shripadk.github.io/react/docs/top-level-api.html#react.createclass)
	React documentation:

			`function createClass(object specification)` Create a component
			given a **specification**. … For more information about
			the **«specification object»**, see Component Specs and Lifecycle
			(https://shripadk.github.io/react/docs/component-specs.html).
*/
export type QsaoSpec = {
	mounted?: (element: Element) => void;
	unmounted?: (element: Element) => void;
};

export type Status = {
	error: boolean;
	message: string;
};

export type StatusSink = (status: Status) => void;

export type App = ReturnType<typeof makeApp>;

export type AvailableStatus =
	(typeof availableStatus)[keyof typeof availableStatus];

export type AvailableSink = (status: AvailableStatus) => void;

export type CountEnd = {
	kind: 'end';
};

export type CountError = {
	kind: 'error';
	reason: string | undefined;
};

export type CountUpdate = {
	kind: 'update';
	count: number;
};

export type CountMessage = CountEnd | CountError | CountUpdate;

export type MessageSink = (message: CountMessage) => void;

export type CountSink = (count: number) => void;

export type Inbound = {
	start: () => void;
	subscribe: (sink: MessageSink) => () => void;
};

export type Outbound = {
	increment: () => Promise<boolean>;
};
