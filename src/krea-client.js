const BASE_URL = "https://api.krea.ai";

export const IMAGE_MODELS = {
  "z-image":           { endpoint: "/generate/image/z-image/z-image",             provider: "Z-Image",    cu: 3,   time: "~5s",   capabilities: ["text-to-image"], description: "Fastest model. Realistic, low diversity" },
  "flux":              { endpoint: "/generate/image/bfl/flux-1-dev",              provider: "BFL",        cu: 5,   time: "~5s",   capabilities: ["text-to-image", "image-to-image", "styles/LoRAs"], description: "Fast and cheap. Best for LoRAs" },
  "flux-kontext":      { endpoint: "/generate/image/bfl/flux-1-kontext-dev",      provider: "BFL",        cu: 9,   time: "~5s",   capabilities: ["text-to-image", "image-to-image"], description: "Flux with context-aware editing" },
  "qwen":              { endpoint: "/generate/image/qwen/2512",                   provider: "Qwen",       cu: 9,   time: "~15s",  capabilities: ["text-to-image"], description: "Good quality at low cost" },
  "imagen-4-fast":     { endpoint: "/generate/image/google/imagen-4-fast",        provider: "Google",     cu: 16,  time: "~17s",  capabilities: ["text-to-image"], description: "Fast Imagen 4 variant" },
  "ideogram-2-turbo":  { endpoint: "/generate/image/ideogram/ideogram-2-turbo",   provider: "Ideogram",   cu: 20,  time: "~8s",   capabilities: ["text-to-image"], description: "Fast with good typography" },
  "seedream-4":        { endpoint: "/generate/image/bytedance/seedream-4",        provider: "ByteDance",  cu: 24,  time: "~20s",  capabilities: ["text-to-image", "image-to-image"], description: "Photorealistic, flexible resolution" },
  "seedream-5-lite":   { endpoint: "/generate/image/bytedance/seedream-5-lite",   provider: "ByteDance",  cu: 28,  time: "~20s",  capabilities: ["text-to-image", "image-to-image"], description: "Latest Seedream, lightweight" },
  "flux-pro":          { endpoint: "/generate/image/bfl/flux-1.1-pro",            provider: "BFL",        cu: 31,  time: "~11s",  capabilities: ["text-to-image", "image-to-image", "styles/LoRAs"], description: "Higher quality Flux" },
  "nano-banana":       { endpoint: "/generate/image/google/nano-banana",          provider: "Google",     cu: 32,  time: "~10s",  capabilities: ["text-to-image", "image-to-image"], description: "Good balance of speed and quality" },
  "imagen-3":          { endpoint: "/generate/image/google/imagen-3",             provider: "Google",     cu: 32,  time: "~32s",  capabilities: ["text-to-image"], description: "Google Imagen 3" },
  "imagen-4":          { endpoint: "/generate/image/google/imagen-4",             provider: "Google",     cu: 32,  time: "~32s",  capabilities: ["text-to-image"], description: "Google Imagen 4" },
  "runway-gen4":       { endpoint: "/generate/image/runway/gen-4",                provider: "Runway",     cu: 40,  time: "~60s",  capabilities: ["image-to-image"], description: "Requires reference images" },
  "flux-pro-ultra":    { endpoint: "/generate/image/bfl/flux-1.1-pro-ultra",      provider: "BFL",        cu: 47,  time: "~18s",  capabilities: ["text-to-image", "image-to-image", "styles/LoRAs"], description: "Highest quality Flux" },
  "imagen-4-ultra":    { endpoint: "/generate/image/google/imagen-4-ultra",       provider: "Google",     cu: 47,  time: "~30s",  capabilities: ["text-to-image"], description: "Highest quality Imagen" },
  "nano-banana-flash": { endpoint: "/generate/image/google/nano-banana-flash",    provider: "Google",     cu: 48,  time: "~15s",  capabilities: ["text-to-image", "image-to-image"], description: "Fast Nano Banana variant" },
  "ideogram-3":        { endpoint: "/generate/image/ideogram/ideogram-3",         provider: "Ideogram",   cu: 54,  time: "~18s",  capabilities: ["text-to-image", "styles"], description: "Best typography and text rendering" },
  "nano-banana-pro":   { endpoint: "/generate/image/google/nano-banana-pro",      provider: "Google",     cu: 119, time: "~30s",  capabilities: ["text-to-image", "image-to-image"], description: "Superior photorealistic detail" },
  "seedream-3":        { endpoint: "/generate/image/bytedance/seedream-3",        provider: "ByteDance",  cu: null, time: "varies", capabilities: ["text-to-image", "image-to-image"], description: "ByteDance Seedream 3" },
  "gpt-image":         { endpoint: "/generate/image/openai/gpt-image",            provider: "OpenAI",     cu: 184, time: "~60s",  capabilities: ["text-to-image", "image-to-image", "styles/LoRAs"], description: "Highest quality, best prompt adherence" },
};

export const VIDEO_MODELS = {
  "kling-1.0":   { endpoint: "/generate/video/kling/kling-1.0",     provider: "Kling",   cu: 282,  time: "~289s (5s video)",  capabilities: ["text-to-video", "image-to-video", "camera-control"], description: "High control, 5-10s duration" },
  "kling-1.5":   { endpoint: "/generate/video/kling/kling-1.5",     provider: "Kling",   cu: null, time: "varies",            capabilities: ["text-to-video", "image-to-video", "camera-control"], description: "Quality-focused, complex scenes" },
  "kling-2.5":   { endpoint: "/generate/video/kling/kling-2.5",     provider: "Kling",   cu: null, time: "varies",            capabilities: ["text-to-video", "image-to-video", "camera-control"], description: "Advanced motion control, realistic physics" },
  "veo-3":       { endpoint: "/generate/video/google/veo-3",        provider: "Google",  cu: 1017, time: "~65-128s",          capabilities: ["text-to-video", "image-to-video", "audio"], description: "High quality, can generate audio" },
  "veo-3.1":     { endpoint: "/generate/video/google/veo-3.1",      provider: "Google",  cu: null, time: "varies",            capabilities: ["text-to-video", "image-to-video"], description: "Exceptional prompt adherence, cinematic" },
  "hailuo-2.3":  { endpoint: "/generate/video/hailuo/hailuo-2.3",   provider: "Hailuo",  cu: null, time: "varies",            capabilities: ["text-to-video", "image-to-video"], description: "Fast, smooth motion, natural transitions" },
  "wan-2.5":     { endpoint: "/generate/video/alibaba/wan-2.5",     provider: "Alibaba", cu: 569,  time: "~180s",             capabilities: ["text-to-video", "image-to-video"], description: "High-res with style control" },
};

export const ENHANCERS = {
  "topaz":            { endpoint: "/generate/enhance/topaz/standard-enhance",    cu: 51,  time: "~19s",  maxResolution: "22K", description: "Faithful upscaler. Models: Standard V2, Low Resolution V2, CGI, High Fidelity V2, Text Refine" },
  "topaz-generative": { endpoint: "/generate/enhance/topaz/generative-enhance",  cu: 137, time: "~96s",  maxResolution: "16K", description: "Creative enhancement. Models: Redefine, Recovery, Recovery V2, Reimagine" },
  "topaz-bloom":      { endpoint: "/generate/enhance/topaz/bloom-enhance",       cu: 256, time: "~132s", maxResolution: "10K", description: "Creative details and upscaling. Model: Reimagine" },
};

export class KreaClient {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error("KREA_API_TOKEN is required. Get one at https://krea.ai/settings/api-tokens");
    }
    this.apiToken = apiToken;
  }

  async request(method, path, body = null, webhookUrl = null) {
    const headers = {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };
    if (webhookUrl) {
      headers["X-Webhook-URL"] = webhookUrl;
    }
    const opts = { method, headers };
    if (body) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${path}`, opts);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Krea API ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ── Jobs ──────────────────────────────────────────────

  async getJob(jobId) {
    return this.request("GET", `/jobs/${jobId}`);
  }

  async listJobs({ cursor, limit, types, status } = {}) {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    if (types) params.set("types", types);
    if (status) params.set("status", status);
    const qs = params.toString();
    return this.request("GET", `/jobs${qs ? `?${qs}` : ""}`);
  }

  async deleteJob(jobId) {
    return this.request("DELETE", `/jobs/${jobId}`);
  }

  // ── Assets ────────────────────────────────────────────

  async uploadAsset(fileBase64, mimeType, description) {
    const boundary = "----KreaBoundary" + Date.now();
    const parts = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="upload.${mimeType.split("/")[1] || "bin"}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
    const fileBuffer = Buffer.from(fileBase64, "base64");
    parts.push(fileBuffer);
    parts.push("\r\n");
    if (description) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\n${description}\r\n`);
    }
    parts.push(`--${boundary}--\r\n`);

    const body = Buffer.concat(parts.map(p => typeof p === "string" ? Buffer.from(p) : p));
    const res = await fetch(`${BASE_URL}/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) {
      throw new Error(`Krea API ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  async listAssets({ cursor, limit } = {}) {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return this.request("GET", `/assets${qs ? `?${qs}` : ""}`);
  }

  async getAsset(id) {
    return this.request("GET", `/assets/${id}`);
  }

  async deleteAsset(id) {
    return this.request("DELETE", `/assets/${id}`);
  }

  // ── Image Generation ──────────────────────────────────

  async generateImage(model, params, webhookUrl) {
    const info = IMAGE_MODELS[model];
    if (!info) {
      throw new Error(`Unknown image model: ${model}. Available: ${Object.keys(IMAGE_MODELS).join(", ")}`);
    }
    return this.request("POST", info.endpoint, params, webhookUrl);
  }

  // ── Image Enhancement ─────────────────────────────────

  async enhanceImage(enhancer, params, webhookUrl) {
    const info = ENHANCERS[enhancer];
    if (!info) {
      throw new Error(`Unknown enhancer: ${enhancer}. Available: ${Object.keys(ENHANCERS).join(", ")}`);
    }
    return this.request("POST", info.endpoint, params, webhookUrl);
  }

  // ── Video Generation ──────────────────────────────────

  async generateVideo(model, params, webhookUrl) {
    const info = VIDEO_MODELS[model];
    if (!info) {
      throw new Error(`Unknown video model: ${model}. Available: ${Object.keys(VIDEO_MODELS).join(", ")}`);
    }
    return this.request("POST", info.endpoint, params, webhookUrl);
  }

  // ── Styles / LoRAs ────────────────────────────────────

  async trainStyle(params, webhookUrl) {
    return this.request("POST", "/styles/train", params, webhookUrl);
  }

  async listStyles({ cursor, limit, ids, liked, user, model, filter } = {}) {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    if (ids) params.set("ids", ids);
    if (liked !== undefined) params.set("liked", String(liked));
    if (user) params.set("user", user);
    if (model) params.set("model", model);
    if (filter) params.set("filter", filter);
    const qs = params.toString();
    return this.request("GET", `/styles${qs ? `?${qs}` : ""}`);
  }

  async getStyle(id) {
    return this.request("GET", `/styles/${id}`);
  }

  async updateStyle(id, params) {
    return this.request("PATCH", `/styles/${id}`, params);
  }

  async getStyleShareLink(id) {
    return this.request("GET", `/styles/${id}/share/link`);
  }

  async shareStyleToWorkspace(id) {
    return this.request("POST", `/styles/${id}/share/workspace`);
  }

  async unshareStyleFromWorkspace(id) {
    return this.request("DELETE", `/styles/${id}/share/workspace`);
  }

  // ── Node Apps ─────────────────────────────────────────

  async getNodeApp(id) {
    return this.request("GET", `/node-apps/${id}`);
  }

  async executeNodeApp(id, params, webhookUrl) {
    return this.request("POST", `/node-apps/${id}/execute`, params, webhookUrl);
  }

  // ── Polling helper ────────────────────────────────────

  async waitForJob(jobId, { intervalMs = 3000, timeoutMs = 600000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const job = await this.getJob(jobId);
      if (job.status === "completed") return job;
      if (job.status === "failed") throw new Error(`Job failed: ${JSON.stringify(job.result)}`);
      if (job.status === "cancelled") throw new Error("Job was cancelled");
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Job ${jobId} timed out after ${timeoutMs / 1000}s`);
  }
}
