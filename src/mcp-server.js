#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KreaClient, IMAGE_MODELS, VIDEO_MODELS, ENHANCERS } from "./krea-client.js";

const client = new KreaClient(process.env.KREA_API_TOKEN);

// Fetch models from the live API before registering tools
await client.init().catch((err) => {
  console.error(`Warning: could not fetch models from API: ${err.message}`);
});

const server = new McpServer({
  name: "krea",
  version: "1.0.0",
  description: "Krea.ai API – generate images, videos, enhance, manage styles & jobs",
});

// ── List Models ─────────────────────────────────────────

server.tool(
  "list_models",
  "List all available Krea AI models with their capabilities, compute unit costs, and estimated generation times. Use this FIRST to discover which models are available before generating.",
  {
    type: z.enum(["image", "video", "enhance", "all"]).optional().describe("Filter by model type. Defaults to 'all'"),
  },
  async ({ type }) => {
    const result = {};
    const showType = type || "all";

    if (showType === "all" || showType === "image") {
      result.image_models = Object.entries(IMAGE_MODELS).map(([id, m]) => ({
        id, provider: m.provider, compute_units: m.cu, estimated_time: m.time,
        parameters: m.parameters, description: m.description,
      }));
    }
    if (showType === "all" || showType === "video") {
      result.video_models = Object.entries(VIDEO_MODELS).map(([id, m]) => ({
        id, provider: m.provider, compute_units: m.cu, estimated_time: m.time,
        parameters: m.parameters, description: m.description,
      }));
    }
    if (showType === "all" || showType === "enhance") {
      result.enhancers = Object.entries(ENHANCERS).map(([id, m]) => ({
        id, compute_units: m.cu, estimated_time: m.time,
        parameters: m.parameters, description: m.description,
      }));
    }

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Image Generation ────────────────────────────────────

server.tool(
  "generate_image",
  "Generate an image using Krea AI. Call list_models first to see available models and their costs.",
  {
    model: z.string().describe("Image model ID (call list_models to see available models)"),
    prompt: z.string().describe("Text description of the image to generate"),
    width: z.number().min(512).max(4096).optional().describe("Image width in pixels"),
    height: z.number().min(512).max(4096).optional().describe("Image height in pixels"),
    aspectRatio: z.enum(["21:9", "1:1", "4:3", "3:2", "2:3", "5:4", "4:5", "3:4", "16:9", "9:16"]).optional().describe("Aspect ratio (for models that support it)"),
    resolution: z.enum(["1K", "2K", "4K"]).optional().describe("Output resolution (nano-banana models)"),
    steps: z.number().min(1).max(100).optional().describe("Inference steps (flux models)"),
    seed: z.number().optional().describe("Random seed for reproducibility"),
    guidance_scale: z.number().min(0).max(24).optional().describe("Guidance scale (flux models)"),
    strength: z.number().optional().describe("Overall strength modifier"),
    batchSize: z.number().min(1).max(4).optional().describe("Number of images to generate"),
    imageUrl: z.string().optional().describe("Reference/input image URL for image-to-image"),
    imageUrls: z.array(z.string()).optional().describe("Multiple reference image URLs"),
    styleImages: z.array(z.object({ url: z.string(), strength: z.number().min(-2).max(2) })).optional().describe("Style reference images with strength"),
    styles: z.array(z.object({ id: z.string(), strength: z.number().min(-2).max(2) })).optional().describe("LoRA style IDs with strength"),
    quality: z.enum(["low", "medium", "high", "auto"]).optional().describe("Quality level (gpt-image)"),
    webhookUrl: z.string().optional().describe("Webhook URL for job completion notification"),
    wait: z.boolean().optional().describe("If true, poll until job completes and return result"),
  },
  async ({ model, webhookUrl, wait, ...params }) => {
    const body = {};
    if (params.prompt) body.prompt = params.prompt;
    if (params.width) body.width = params.width;
    if (params.height) body.height = params.height;
    if (params.aspectRatio) body.aspectRatio = params.aspectRatio;
    if (params.resolution) body.resolution = params.resolution;
    if (params.steps) body.steps = params.steps;
    if (params.seed !== undefined) body.seed = params.seed;
    if (params.guidance_scale !== undefined) body.guidance_scale_flux = params.guidance_scale;
    if (params.strength !== undefined) body.strength = params.strength;
    if (params.batchSize) body.batchSize = params.batchSize;
    if (params.imageUrl) body.imageUrl = params.imageUrl;
    if (params.imageUrls) body.imageUrls = params.imageUrls;
    if (params.styleImages) body.styleImages = params.styleImages;
    if (params.styles) body.styles = params.styles;
    if (params.quality) body.quality = params.quality;

    const job = await client.generateImage(model, body, webhookUrl);
    if (wait) {
      const result = await client.waitForJob(job.job_id);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
  }
);

// ── Video Generation ────────────────────────────────────

server.tool(
  "generate_video",
  "Generate a video using Krea AI. Call list_models first to see available models and their costs.",
  {
    model: z.string().describe("Video model ID (call list_models to see available models)"),
    prompt: z.string().describe("Text description of the video to generate"),
    startImage: z.string().optional().describe("Starting image URL for image-to-video"),
    endImage: z.string().optional().describe("End frame image URL (kling models)"),
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional().describe("Video aspect ratio"),
    duration: z.number().optional().describe("Duration in seconds"),
    resolution: z.enum(["720p", "1080p"]).optional().describe("Video resolution (veo models)"),
    mode: z.enum(["std", "pro"]).optional().describe("Quality mode (kling models)"),
    generateAudio: z.boolean().optional().describe("Generate audio (veo-3)"),
    cameraControl: z.object({
      type: z.string(),
      config: z.record(z.number()).optional(),
    }).optional().describe("Camera control (kling models). Types: simple (with zoom/roll/pan/tilt/vertical/horizontal -10 to 10), down_back, forward_up, right_turn_forward, left_turn_forward"),
    webhookUrl: z.string().optional().describe("Webhook URL for job completion notification"),
    wait: z.boolean().optional().describe("If true, poll until job completes and return result"),
  },
  async ({ model, webhookUrl, wait, ...params }) => {
    const body = {};
    if (params.prompt) body.prompt = params.prompt;
    if (params.startImage) body.startImage = params.startImage;
    if (params.endImage) body.endImage = params.endImage;
    if (params.aspectRatio) body.aspectRatio = params.aspectRatio;
    if (params.duration !== undefined) body.duration = params.duration;
    if (params.resolution) body.resolution = params.resolution;
    if (params.mode) body.mode = params.mode;
    if (params.generateAudio !== undefined) body.generateAudio = params.generateAudio;
    if (params.cameraControl) body.cameraControl = params.cameraControl;

    const job = await client.generateVideo(model, body, webhookUrl);
    if (wait) {
      const result = await client.waitForJob(job.job_id, { intervalMs: 5000 });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
  }
);

// ── Image Enhancement ───────────────────────────────────

server.tool(
  "enhance_image",
  "Upscale/enhance an image using Krea AI. Call list_models with type 'enhance' to see available enhancers.",
  {
    enhancer: z.string().describe("Enhancer ID (call list_models to see available enhancers)"),
    image_url: z.string().describe("URL of the image to enhance"),
    width: z.number().min(1).max(32000).describe("Target width"),
    height: z.number().min(1).max(32000).describe("Target height"),
    model: z.string().optional().describe("Sub-model: topaz=(Standard V2, Low Resolution V2, CGI, High Fidelity V2, Text Refine), topaz-generative=(Redefine, Recovery, Recovery V2, Reimagine), topaz-bloom=(Reimagine)"),
    prompt: z.string().optional().describe("Optional prompt for creative enhancement"),
    seed: z.number().optional(),
    creativity: z.number().optional().describe("Creativity level (topaz-generative: 1-6, topaz-bloom: 1-9)"),
    face_enhancement: z.boolean().optional(),
    upscaling_activated: z.boolean().optional(),
    image_scaling_factor: z.number().min(1).max(32).optional(),
    sharpen: z.number().min(0).max(1).optional(),
    denoise: z.number().min(0).max(1).optional(),
    crop_to_fill: z.boolean().optional(),
    output_format: z.enum(["png", "jpg", "webp"]).optional(),
    webhookUrl: z.string().optional(),
    wait: z.boolean().optional().describe("If true, poll until job completes"),
  },
  async ({ enhancer, webhookUrl, wait, ...params }) => {
    const job = await client.enhanceImage(enhancer, params, webhookUrl);
    if (wait) {
      const result = await client.waitForJob(job.job_id, { intervalMs: 5000 });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
  }
);

// ── Job Management ──────────────────────────────────────

server.tool(
  "get_job",
  "Get the status and result of a Krea job by ID",
  {
    job_id: z.string().describe("The job UUID"),
  },
  async ({ job_id }) => {
    const job = await client.getJob(job_id);
    return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
  }
);

server.tool(
  "list_jobs",
  "List Krea jobs with optional filtering",
  {
    cursor: z.string().optional().describe("ISO 8601 timestamp for pagination"),
    limit: z.number().min(1).max(1000).optional().describe("Number of jobs to return (default 100)"),
    types: z.string().optional().describe("Comma-separated job types"),
    status: z.enum(["backlogged", "queued", "scheduled", "processing", "sampling", "intermediate-complete", "completed", "failed", "cancelled"]).optional(),
  },
  async (params) => {
    const jobs = await client.listJobs(params);
    return { content: [{ type: "text", text: JSON.stringify(jobs, null, 2) }] };
  }
);

server.tool(
  "delete_job",
  "Cancel/delete a Krea job",
  {
    job_id: z.string().describe("The job UUID to delete"),
  },
  async ({ job_id }) => {
    await client.deleteJob(job_id);
    return { content: [{ type: "text", text: `Job ${job_id} deleted.` }] };
  }
);

// ── Assets ──────────────────────────────────────────────

server.tool(
  "upload_asset",
  "Upload a file (image, video, audio, 3D model) to Krea. Max 75MB. Supported: JPEG, PNG, WebP, HEIC, MP4, MOV, WebM, GLB, WAV, MP3",
  {
    file_base64: z.string().describe("Base64-encoded file content"),
    mime_type: z.string().describe("MIME type (e.g. image/png, video/mp4)"),
    description: z.string().optional().describe("Optional description"),
  },
  async ({ file_base64, mime_type, description }) => {
    const asset = await client.uploadAsset(file_base64, mime_type, description);
    return { content: [{ type: "text", text: JSON.stringify(asset, null, 2) }] };
  }
);

server.tool(
  "list_assets",
  "List uploaded assets",
  {
    cursor: z.string().optional(),
    limit: z.number().optional(),
  },
  async (params) => {
    const assets = await client.listAssets(params);
    return { content: [{ type: "text", text: JSON.stringify(assets, null, 2) }] };
  }
);

server.tool(
  "get_asset",
  "Get details of an uploaded asset",
  { id: z.string().describe("Asset ID") },
  async ({ id }) => {
    const asset = await client.getAsset(id);
    return { content: [{ type: "text", text: JSON.stringify(asset, null, 2) }] };
  }
);

server.tool(
  "delete_asset",
  "Delete an uploaded asset",
  { id: z.string().describe("Asset ID") },
  async ({ id }) => {
    await client.deleteAsset(id);
    return { content: [{ type: "text", text: `Asset ${id} deleted.` }] };
  }
);

// ── Styles / LoRAs ──────────────────────────────────────

server.tool(
  "train_style",
  "Train a custom LoRA style on Krea. Upload 3-2000 training images. Models: flux_dev, flux_schnell, wan, wan22, qwen, z-image",
  {
    model: z.string().describe("Base model for training (e.g. flux_dev, flux_schnell, wan, qwen, z-image)"),
    name: z.string().describe("Style name"),
    urls: z.array(z.string()).describe("Array of training image URLs"),
    type: z.enum(["Style", "Object", "Character", "Default"]).optional().describe("Type of LoRA"),
    trigger_word: z.string().optional().describe("Trigger word for the style"),
    learning_rate: z.number().optional(),
    max_train_steps: z.number().min(1).max(2000).optional(),
    batch_size: z.number().optional(),
    webhookUrl: z.string().optional(),
  },
  async ({ webhookUrl, ...params }) => {
    const job = await client.trainStyle(params, webhookUrl);
    return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
  }
);

server.tool(
  "list_styles",
  "Search/list Krea styles (LoRAs)",
  {
    cursor: z.string().optional(),
    limit: z.number().optional(),
    ids: z.string().optional().describe("Comma-separated style IDs"),
    liked: z.boolean().optional(),
    user: z.string().optional().describe("Filter by creator"),
    model: z.string().optional().describe("Filter by model"),
    filter: z.enum(["all", "user", "community", "krea", "shared", "unapproved", "editor", "gallery", "public"]).optional(),
  },
  async (params) => {
    const styles = await client.listStyles(params);
    return { content: [{ type: "text", text: JSON.stringify(styles, null, 2) }] };
  }
);

server.tool(
  "get_style",
  "Get details of a Krea style/LoRA",
  { id: z.string().describe("Style ID") },
  async ({ id }) => {
    const style = await client.getStyle(id);
    return { content: [{ type: "text", text: JSON.stringify(style, null, 2) }] };
  }
);

server.tool(
  "update_style",
  "Update a Krea style/LoRA (must be owner)",
  {
    id: z.string().describe("Style ID"),
    public: z.boolean().optional(),
    title: z.string().optional(),
    cover_url: z.string().optional(),
    urls: z.array(z.string()).optional(),
  },
  async ({ id, ...params }) => {
    const style = await client.updateStyle(id, params);
    return { content: [{ type: "text", text: JSON.stringify(style, null, 2) }] };
  }
);

server.tool(
  "share_style",
  "Get a shareable link for a style, or share/unshare with workspace",
  {
    id: z.string().describe("Style ID"),
    action: z.enum(["link", "share_workspace", "unshare_workspace"]).describe("Share action"),
  },
  async ({ id, action }) => {
    let result;
    if (action === "link") result = await client.getStyleShareLink(id);
    else if (action === "share_workspace") result = await client.shareStyleToWorkspace(id);
    else result = await client.unshareStyleFromWorkspace(id);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Node Apps ───────────────────────────────────────────

server.tool(
  "get_node_app",
  "Get details of a Krea node app including its input/output schemas",
  { id: z.string().describe("Node app version ID") },
  async ({ id }) => {
    const app = await client.getNodeApp(id);
    return { content: [{ type: "text", text: JSON.stringify(app, null, 2) }] };
  }
);

server.tool(
  "execute_node_app",
  "Execute a Krea node app with custom input parameters",
  {
    id: z.string().describe("Node app version ID"),
    params: z.record(z.any()).describe("Input parameters matching the app's input schema"),
    webhookUrl: z.string().optional(),
  },
  async ({ id, params, webhookUrl }) => {
    const result = await client.executeNodeApp(id, params, webhookUrl);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ── Start server ────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
