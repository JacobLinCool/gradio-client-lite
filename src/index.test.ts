import { describe, it, expect } from "vitest";
import { GradioClientLite } from "./index";

describe("GradioClientLite", { timeout: 60_000 }, () => {
	it("should predict correctly", async () => {
		const client = await GradioClientLite.connect("black-forest-labs/FLUX.1-schnell");

		const result = await client.predict<{ path: string }[]>("/infer", [
			"An image of a cat",
			0,
			true,
			512,
			512,
			4,
		]);

		expect(result).toBeTruthy();
		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);
		expect(result[0]).toHaveProperty("path");
		expect(typeof result[0].path).toBe("string");

		const res = await client.download(result[0].path);
		expect(res.status).toBe(200);
	});
});
