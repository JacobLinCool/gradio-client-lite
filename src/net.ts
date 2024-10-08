export const net = {
	/**
	 * A reference to the global fetch function.
	 * This allows for easy mocking in tests or replacing with a custom implementation.
	 */
	fetch: globalThis.fetch.bind(globalThis),

	/**
	 * Default headers to be used in fetch requests.
	 */
	headers: {} as Record<string, string>,
};
