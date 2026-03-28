#!/usr/bin/env node

/**
 * Krea AI Remote MCP Server
 *
 * Exposes the Krea API as a remote MCP server over HTTP.
 * Supports both Streamable HTTP (2025-11-25) and legacy SSE (2024-11-05) transports.
 *
 * Usage:
 *   KREA_API_TOKEN=xxx node src/mcp-remote.js
 *   KREA_API_TOKEN=xxx PORT=8080 node src/mcp-remote.js
 *
 * Endpoints:
 *   POST /mcp   — Streamable HTTP (recommended, used by claude.ai)
 *   GET  /sse   — Legacy SSE stream
 *   POST /messages?sessionId=<id> — Legacy SSE message posting
 */

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { z } from "zod";
import { KreaClient } from "./krea-client.js";

// ── Register all Krea tools on a server instance ────────

function registerKreaTools(server, client) {
  // ── Image Generation ────────────────────────────────

  server.tool(
    "generate_image",
    "Generate an image using Krea AI. Models: flux (~5 CU, ~5s), flux-kontext (~9 CU), flux-pro (~31 CU), flux-pro-ultra (~47 CU), nano-banana (~32 CU), nano-banana-flash (~48 CU), nano-banana-pro (~119 CU), imagen-3 (~32 CU), imagen-4 (~32 CU), imagen-4-fast (~16 CU), imagen-4-ultra (~47 CU), ideogram-2-turbo (~20 CU), ideogram-3 (~54 CU), gpt-image (~184 CU, ~60s), runway-gen4 (~40 CU), seedream-3, seedream-4 (~24 CU), seedream-5-lite (~28 CU), qwen (~9 CU), z-image (~3 CU, fastest)",
    {
      model: z.enum([
        "flux", "flux-kontext", "flux-pro", "flux-pro-ultra",
        "nano-banana", "nano-banana-flash", "nano-banana-pro",
        "imagen-3", "imagen-4", "imagen-4-fast", "imagen-4-ultra",
        "ideogram-2-turbo", "ideogram-3",
        "gpt-image", "runway-gen4",
        "seedream-3", "seedream-4", "seedream-5-lite",
        "qwen", "z-image",
      ]).describe("Image model to use"),
      prompt: z.string().describe("Text description of the image to generate"),
      width: z.number().min(512).max(4096).optional().describe("Image width in pixels"),
      height: z.number().min(512).max(4096).optional().describe("Image height in pixels"),
      aspectRatio: z.enum(["21:9", "1:1", "4:3", "3:2", "2:3", "5:4", "4:5", "3:4", "16:9", "9:16"]).optional(),
      resolution: z.enum(["1K", "2K", "4K"]).optional().describe("Output resolution (nano-banana models)"),
      steps: z.number().min(1).max(100).optional().describe("Inference steps (flux models)"),
      seed: z.number().optional().describe("Random seed for reproducibility"),
      guidance_scale: z.number().min(0).max(24).optional().describe("Guidance scale (flux models)"),
      strength: z.number().optional().describe("Overall strength modifier"),
      batchSize: z.number().min(1).max(4).optional(),
      imageUrl: z.string().optional().describe("Reference/input image URL for image-to-image"),
      imageUrls: z.array(z.string()).optional().describe("Multiple reference image URLs"),
      styleImages: z.array(z.object({ url: z.string(), strength: z.number().min(-2).max(2) })).optional(),
      styles: z.array(z.object({ id: z.string(), strength: z.number().min(-2).max(2) })).optional().describe("LoRA style IDs with strength"),
      quality: z.enum(["low", "medium", "high", "auto"]).optional().describe("Quality level (gpt-image)"),
      webhookUrl: z.string().optional(),
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

  // ── Video Generation ────────────────────────────────

  server.tool(
    "generate_video",
    "Generate a video using Krea AI. Models: kling-1.0, kling-1.5, kling-2.5, veo-3 (~608-1281 CU), veo-3.1, hailuo-2.3, wan-2.5",
    {
      model: z.enum(["kling-1.0", "kling-1.5", "kling-2.5", "veo-3", "veo-3.1", "hailuo-2.3", "wan-2.5"]).describe("Video model"),
      prompt: z.string().describe("Text description of the video"),
      startImage: z.string().optional().describe("Starting image URL for image-to-video"),
      endImage: z.string().optional().describe("End frame image URL (kling only)"),
      aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
      duration: z.number().optional().describe("Duration in seconds"),
      resolution: z.enum(["720p", "1080p"]).optional().describe("Video resolution (veo models)"),
      mode: z.enum(["std", "pro"]).optional().describe("Quality mode (kling)"),
      generateAudio: z.boolean().optional().describe("Generate audio (veo-3)"),
      cameraControl: z.object({
        type: z.string(),
        config: z.record(z.number()).optional(),
      }).optional().describe("Camera control (kling). Types: simple (zoom/roll/pan/tilt/vertical/horizontal -10..10), down_back, forward_up, right_turn_forward, left_turn_forward"),
      webhookUrl: z.string().optional(),
      wait: z.boolean().optional().describe("If true, poll until job completes"),
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

  // ── Image Enhancement ───────────────────────────────

  server.tool(
    "enhance_image",
    "Upscale/enhance an image. Enhancers: topaz (faithful, 22K, ~51 CU), topaz-generative (creative, 16K, ~137 CU), topaz-bloom (creative details, 10K, ~256 CU)",
    {
      enhancer: z.enum(["topaz", "topaz-generative", "topaz-bloom"]).describe("Enhancement model"),
      image_url: z.string().describe("URL of image to enhance"),
      width: z.number().min(1).max(32000).describe("Target width"),
      height: z.number().min(1).max(32000).describe("Target height"),
      model: z.string().optional().describe("Sub-model variant"),
      prompt: z.string().optional(),
      seed: z.number().optional(),
      creativity: z.number().optional(),
      face_enhancement: z.boolean().optional(),
      upscaling_activated: z.boolean().optional(),
      image_scaling_factor: z.number().min(1).max(32).optional(),
      sharpen: z.number().min(0).max(1).optional(),
      denoise: z.number().min(0).max(1).optional(),
      crop_to_fill: z.boolean().optional(),
      output_format: z.enum(["png", "jpg", "webp"]).optional(),
      webhookUrl: z.string().optional(),
      wait: z.boolean().optional(),
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

  // ── Job Management ──────────────────────────────────

  server.tool(
    "get_job",
    "Get the status and result of a Krea job",
    { job_id: z.string().describe("Job UUID") },
    async ({ job_id }) => {
      const job = await client.getJob(job_id);
      return { content: [{ type: "text", text: JSON.stringify(job, null, 2) }] };
    }
  );

  server.tool(
    "list_jobs",
    "List Krea jobs with optional filtering",
    {
      cursor: z.string().optional(),
      limit: z.number().min(1).max(1000).optional(),
      types: z.string().optional(),
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
    { job_id: z.string().describe("Job UUID") },
    async ({ job_id }) => {
      await client.deleteJob(job_id);
      return { content: [{ type: "text", text: `Job ${job_id} deleted.` }] };
    }
  );

  // ── Assets ──────────────────────────────────────────

  server.tool(
    "upload_asset",
    "Upload a file to Krea (max 75MB). Supports JPEG, PNG, WebP, HEIC, MP4, MOV, WebM, GLB, WAV, MP3",
    {
      file_base64: z.string().describe("Base64-encoded file content"),
      mime_type: z.string().describe("MIME type (e.g. image/png)"),
      description: z.string().optional(),
    },
    async ({ file_base64, mime_type, description }) => {
      const asset = await client.uploadAsset(file_base64, mime_type, description);
      return { content: [{ type: "text", text: JSON.stringify(asset, null, 2) }] };
    }
  );

  server.tool(
    "list_assets",
    "List uploaded assets",
    { cursor: z.string().optional(), limit: z.number().optional() },
    async (params) => {
      const assets = await client.listAssets(params);
      return { content: [{ type: "text", text: JSON.stringify(assets, null, 2) }] };
    }
  );

  server.tool(
    "get_asset",
    "Get details of an uploaded asset",
    { id: z.string() },
    async ({ id }) => {
      const asset = await client.getAsset(id);
      return { content: [{ type: "text", text: JSON.stringify(asset, null, 2) }] };
    }
  );

  server.tool(
    "delete_asset",
    "Delete an uploaded asset",
    { id: z.string() },
    async ({ id }) => {
      await client.deleteAsset(id);
      return { content: [{ type: "text", text: `Asset ${id} deleted.` }] };
    }
  );

  // ── Styles / LoRAs ─────────────────────────────────

  server.tool(
    "train_style",
    "Train a custom LoRA style. Models: flux_dev, flux_schnell, wan, wan22, qwen, z-image",
    {
      model: z.enum(["flux_dev", "flux_schnell", "wan", "wan22", "qwen", "z-image"]),
      name: z.string(),
      urls: z.array(z.string()).describe("Training image URLs (3-2000)"),
      type: z.enum(["Style", "Object", "Character", "Default"]).optional(),
      trigger_word: z.string().optional(),
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
      ids: z.string().optional(),
      liked: z.boolean().optional(),
      user: z.string().optional(),
      model: z.string().optional(),
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
    { id: z.string() },
    async ({ id }) => {
      const style = await client.getStyle(id);
      return { content: [{ type: "text", text: JSON.stringify(style, null, 2) }] };
    }
  );

  server.tool(
    "update_style",
    "Update a style (must be owner)",
    {
      id: z.string(),
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
    "Share a style: get link, share/unshare with workspace",
    {
      id: z.string(),
      action: z.enum(["link", "share_workspace", "unshare_workspace"]),
    },
    async ({ id, action }) => {
      let result;
      if (action === "link") result = await client.getStyleShareLink(id);
      else if (action === "share_workspace") result = await client.shareStyleToWorkspace(id);
      else result = await client.unshareStyleFromWorkspace(id);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── Node Apps ───────────────────────────────────────

  server.tool(
    "get_node_app",
    "Get details and schemas of a Krea node app",
    { id: z.string() },
    async ({ id }) => {
      const app = await client.getNodeApp(id);
      return { content: [{ type: "text", text: JSON.stringify(app, null, 2) }] };
    }
  );

  server.tool(
    "execute_node_app",
    "Execute a Krea node app with custom input",
    {
      id: z.string(),
      params: z.record(z.any()).describe("Input params matching the app's schema"),
      webhookUrl: z.string().optional(),
    },
    async ({ id, params, webhookUrl }) => {
      const result = await client.executeNodeApp(id, params, webhookUrl);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}

// ── Create server factory (each session gets its own) ───

function createServer(kreaClient) {
  const server = new McpServer(
    { name: "krea", version: "1.0.0" },
    { capabilities: { logging: {} } }
  );
  registerKreaTools(server, kreaClient);
  return server;
}

// ── HTTP server setup ───────────────────────────────────

const kreaClient = new KreaClient(process.env.KREA_API_TOKEN);
const app = createMcpExpressApp();
const transports = {};

// Streamable HTTP transport (current protocol)
app.all("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  let transport;

  if (sessionId && transports[sessionId]) {
    const existing = transports[sessionId];
    if (existing instanceof StreamableHTTPServerTransport) {
      transport = existing;
    } else {
      res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Session uses different transport" }, id: null });
      return;
    }
  } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
    const eventStore = new InMemoryEventStore();
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      eventStore,
      onsessioninitialized: (sid) => {
        transports[sid] = transport;
      },
    });
    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) delete transports[sid];
    };
    const server = createServer(kreaClient);
    await server.connect(transport);
  } else {
    res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session" }, id: null });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

// Legacy SSE transport (for older clients)
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;
  res.on("close", () => delete transports[transport.sessionId]);
  const server = createServer(kreaClient);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport instanceof SSEServerTransport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "krea-mcp", version: "1.0.0" });
});

// Start
const PORT = parseInt(process.env.PORT || "3001", 10);
app.listen(PORT, () => {
  console.log(`Krea MCP server running on http://localhost:${PORT}`);
  console.log(`  Streamable HTTP: POST http://localhost:${PORT}/mcp`);
  console.log(`  Legacy SSE:      GET  http://localhost:${PORT}/sse`);
  console.log(`  Health check:    GET  http://localhost:${PORT}/health`);
});

process.on("SIGINT", async () => {
  for (const sid of Object.keys(transports)) {
    await transports[sid].close?.();
    delete transports[sid];
  }
  process.exit(0);
});
