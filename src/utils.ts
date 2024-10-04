import { net } from "./net";

/**
 * Cache for storing resolved replicas to reduce API calls.
 */
const replicaCache: Record<string, [string, number]> = {};

/**
 * Reads Server-Sent Events (SSE) from a response.
 * @param res - The response object to read from.
 * @param event - The event name to filter for.
 * @param count - The number of events to read.
 * @returns An array of event data strings.
 * @throws If the response body is not readable.
 */
export async function readSSE(res: Response, event: string, count: number): Promise<string[]> {
	const reader = res.body?.getReader();
	if (!reader) {
		throw new Error("Response body is not readable");
	}

	const decoder = new TextDecoder();
	let eventCount = 0;
	const events: string[] = [];

	let reading = true;
	let buffer = "";
	let flag = false;
	while (reading || buffer.includes("\n")) {
		if (reading) {
			const { done, value } = await reader.read();
			reading = !done;
			const text = decoder.decode(value);
			console.log({ text });
			buffer += text;
		}

		if (reading && !buffer.includes("\n")) {
			continue;
		}
		let [current, ...next] = buffer.split("\n");
		buffer = next.join("\n").trimStart();
		console.log({ current, buffer, flag, eventCount });

		if (flag) {
			events.push(current.slice(6));
			flag = false;

			eventCount++;
			if (eventCount >= count) {
				break;
			}
		}
		if (current.startsWith(`event: ${event}`)) {
			flag = true;
		}
	}

	return events;
}

/**
 * Resolves a replica for a given Hugging Face Space.
 * @param user - The username of the Space owner.
 * @param repo - The name of the Space repository.
 * @param headers - Additional headers to include in the request.
 * @returns The resolved replica URL or undefined if not found.
 */
export async function resolveReplica(
	user: string,
	repo: string,
	headers: Record<string, string> = {},
): Promise<string | undefined> {
	try {
		const cacheKey = `${user}-${repo}`;
		const cached = replicaCache[cacheKey];
		if (cached && cached[1] > Date.now()) {
			return cached[0];
		}

		const url = `https://api.hf.space/v1/${user}/${repo}/live-metrics/sse`;
		const res = await net.fetch(url, { headers: { ...net.headers, ...headers } });
		if (!res.ok) {
			throw new Error(`Failed to fetch replica: ${res.statusText}`);
		}

		const events = await readSSE(res as never, "metric", 3);
		const metrics = events
			.map((event) => {
				try {
					return JSON.parse(event);
				} catch {
					return undefined;
				}
			})
			.filter(Boolean);
		const replica: string | undefined =
			metrics[Math.floor(Math.random() * metrics.length)].replica;
		if (!replica) {
			throw new Error("Replica not found in metrics");
		}
		console.log(`Selected replica: ${replica}`);

		replicaCache[cacheKey] = [replica, Date.now() + 30_000];
		return replica;
	} catch (e) {
		console.error(e);
		return undefined;
	}
}

/**
 * Converts a username and repository name into a slug.
 * @param user - The username.
 * @param repo - The repository name.
 * @returns The slugified string.
 */
export function slugify(user: string, repo: string): string {
	user = user.toLowerCase();
	repo = repo.toLowerCase();
	return `${user}-${repo}`.replace(/[^a-z0-9-]+/gi, "-");
}
