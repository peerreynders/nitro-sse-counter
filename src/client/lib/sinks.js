// @ts-check
/** @template T */
class Sinks {
	/** @type { Set<(value: T) => void> } */
	sinks = new Set();

	/* Implemented as properties so that functions
	 * can be used directly without going through the
	 * specific Sinks<T> instance they are attached to.
	 */

	/**
	 * @param { (value: T) => void } sink
	 * @returns { () => void }
	 */
	add = (sink) => {
		const remove = () => void this.sinks.delete(sink);
		this.sinks.add(sink);
		return remove;
	};

	/** @param { T } value
	 * @returns { void }
	 */
	send = (value) => {
		for (const sink of this.sinks) sink(value);
	};

	/** @param { T } value
	 * @param { (value: T) => void } skip
	 * @returns { void }
	 */
	sendSkip = (value, skip) => {
		for (const sink of this.sinks) {
			if (sink === skip) continue;
			sink(value);
		}
	};
}

export { Sinks };
