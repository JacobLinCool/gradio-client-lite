# gradio-client-lite

A zero-dependency, platform-independent, and lightweight Gradio client.

Works on serverless platforms, replica affinity mechanism included.

## Features

-   Zero dependencies
-   Platform-independent
-   Works on serverless platforms
-   Includes replica affinity mechanism

## Usage

```ts
import { GradioClientLite } from "gradio-client-lite";

// Connect to a Gradio app on HuggingFace Spaces
const client = await GradioClientLite.connect("black-forest-labs/FLUX.1-schnell");

// Run inference and get the result
const result = await client.predict<{ path: string }[]>("/infer", [
    "An image of a cat",
    0,
    true,
    512,
    512,
    4,
]);

// Download the file since we are generating an image
const res = await client.download(result[0].path);
```
