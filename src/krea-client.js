const BASE_URL = "https://api.krea.ai";
const OPENAPI_URL = "https://api.krea.ai/openapi.json";

// Model registries — populated dynamically from the OpenAPI spec at startup
export let IMAGE_MODELS = {};
export let VIDEO_MODELS = {};
export let ENHANCERS = {};

/**
 * Fetch available models from the live Krea OpenAPI spec.
 * Populates IMAGE_MODELS, VIDEO_MODELS, and ENHANCERS exports.
 */
export async function fetchModelRegistry() {
  const res = await fetch(OPENAPI_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Failed to fetch OpenAPI spec: ${res.status}`);
  const spec = await res.json();

  const imageModels = {};
  const videoModels = {};
  const enhancers = {};

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    const post = methods.post;
    if (!post) continue;

    const description = post.description || post.summary || "";

    // Extract compute units and time from description
    const cuMatch = description.match(/~?(\d+)\s*(?:CU|compute units)/i);
    const timeMatch = description.match(/~?(\d+)\s*(?:s|seconds)/i);
    const cu = cuMatch ? parseInt(cuMatch[1]) : null;
    const time = timeMatch ? `~${timeMatch[1]}s` : null;

    // Extract parameters from request body schema
    const bodySchema = post.requestBody?.content?.["application/json"]?.schema || {};
    const params = Object.keys(bodySchema.properties || {});

    if (path.startsWith("/generate/image/")) {
      const parts = path.replace("/generate/image/", "").split("/");
      const provider = parts[0] || "";
      const modelName = parts[1] || parts[0];
      imageModels[modelName] = {
        endpoint: path, provider, cu, time,
        parameters: params,
        description: description.split(".")[0],
      };
    } else if (path.startsWith("/generate/video/")) {
      const parts = path.replace("/generate/video/", "").split("/");
      const provider = parts[0] || "";
      const modelName = parts[1] || parts[0];
      videoModels[modelName] = {
        endpoint: path, provider, cu, time,
        parameters: params,
        description: description.split(".")[0],
      };
    } else if (path.startsWith("/generate/enhance/")) {
      const parts = path.replace("/generate/enhance/", "").split("/");
      const provider = parts[0] || "";
      const modelName = parts[1] || parts[0];
      const id = provider !== modelName ? `${provider}-${modelName}` : modelName;
      enhancers[id] = {
        endpoint: path, provider, cu, time,
        parameters: params,
        description: description.split(".")[0],
      };
    }
  }

  // Update the module-level exports
  IMAGE_MODELS = imageModels;
  VIDEO_MODELS = videoModels;
  ENHANCERS = enhancers;

  return { imageModels, videoModels, enhancers };
}

export class KreaClient {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error("KREA_API_TOKEN is required. Get one at https://krea.ai/settings/api-tokens");
    }
    this.apiToken = apiToken;
  }

  /** Fetch models from OpenAPI spec. Call once at startup. */
  async init() {
    await fetchModelRegistry();
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
