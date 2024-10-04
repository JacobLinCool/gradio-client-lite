import { readSSE, resolveReplica, slugify } from "./utils";
import { net } from "./net";

/**
 * Represents a Gradio endpoint path.
 */
export type Endpoint = `/${string}`;

/**
 * Represents a Hugging Face Space identifier.
 */
export type Space = `${string}/${string}`;

/**
 * A lightweight client for interacting with Gradio-based Hugging Face Spaces.
 */
export class GradioClientLite<S extends Space = Space> {
	/**
	 * Creates a new GradioClientLite instance.
	 * @param host - The host URL of the Gradio Space.
	 */
	constructor(public readonly host: string) {}

	/**
	 * Submits data to a Gradio endpoint.
	 * @param endpoint - The endpoint to submit to.
	 * @param data - The data to submit.
	 * @returns The event ID of the submission.
	 * @throws If the event ID is invalid.
	 */
	public async submit(endpoint: Endpoint, data: unknown[]): Promise<string> {
		const submission = await net.fetch(`${this.host}/call${endpoint}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ data }),
		});
		console.log(submission.status);
		const event = await submission.json();
		const event_id = event.event_id;
		if (typeof event_id !== "string") {
			throw new Error("Invalid event_id");
		}
		return event_id;
	}

	/**
	 * Streams the result of a submission from a Gradio endpoint.
	 * @param endpoint - The endpoint to stream from.
	 * @param event_id - The event ID of the submission.
	 * @returns The streamed result.
	 */
	public async stream<T = unknown>(endpoint: Endpoint, event_id: string): Promise<T> {
		const stream = await net.fetch(`${this.host}/call${endpoint}/${event_id}`);
		console.log("stream status", stream.status);
		const data = await readSSE(stream, "complete", 1);
		console.log("stream data", data);
		const result = JSON.parse(data[0]);
		return result;
	}

	/**
	 * Submits data to a Gradio endpoint and streams the result.
	 * @param endpoint - The endpoint to predict on.
	 * @param data - The data to submit for prediction.
	 * @returns The prediction result.
	 */
	public async predict<T = unknown>(endpoint: Endpoint, data: unknown[]): Promise<T> {
		const event_id = await this.submit(endpoint, data);
		return this.stream<T>(endpoint, event_id);
	}

	/**
	 * Downloads a file from the Gradio Space.
	 * @param path - The path of the file to download.
	 * @returns The response containing the file.
	 */
	public async download(path: string): Promise<Response> {
		return net.fetch(`${this.host}/file=${path}`);
	}

	/**
	 * Creates a new GradioClientLite instance connected to a specific Hugging Face Space.
	 * @param space - The identifier of the Hugging Face Space.
	 * @returns A new GradioClientLite instance.
	 */
	public static async connect<S extends Space>(space: S): Promise<GradioClientLite<S>> {
		const [user, repo] = space.split("/");
		const replica = await resolveReplica(user, repo);
		const slug = slugify(user, repo);
		const host = `https://${slug}.hf.space/--replicas/${replica}`;
		console.log({ host });
		return new GradioClientLite(host);
	}
}
