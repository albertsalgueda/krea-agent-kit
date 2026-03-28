const BASE_URL = "https://api.krea.ai";

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
    const modelPaths = {
      "flux": "/generate/image/bfl/flux-1-dev",
      "flux-kontext": "/generate/image/bfl/flux-1-kontext-dev",
      "flux-pro": "/generate/image/bfl/flux-1.1-pro",
      "flux-pro-ultra": "/generate/image/bfl/flux-1.1-pro-ultra",
      "nano-banana": "/generate/image/google/nano-banana",
      "nano-banana-flash": "/generate/image/google/nano-banana-flash",
      "nano-banana-pro": "/generate/image/google/nano-banana-pro",
      "imagen-3": "/generate/image/google/imagen-3",
      "imagen-4": "/generate/image/google/imagen-4",
      "imagen-4-fast": "/generate/image/google/imagen-4-fast",
      "imagen-4-ultra": "/generate/image/google/imagen-4-ultra",
      "ideogram-2-turbo": "/generate/image/ideogram/ideogram-2-turbo",
      "ideogram-3": "/generate/image/ideogram/ideogram-3",
      "gpt-image": "/generate/image/openai/gpt-image",
      "runway-gen4": "/generate/image/runway/gen-4",
      "seedream-3": "/generate/image/bytedance/seedream-3",
      "seedream-4": "/generate/image/bytedance/seedream-4",
      "seedream-5-lite": "/generate/image/bytedance/seedream-5-lite",
      "qwen": "/generate/image/qwen/2512",
      "z-image": "/generate/image/z-image/z-image",
    };
    const path = modelPaths[model];
    if (!path) {
      throw new Error(`Unknown image model: ${model}. Available: ${Object.keys(modelPaths).join(", ")}`);
    }
    return this.request("POST", path, params, webhookUrl);
  }

  // ── Image Enhancement ─────────────────────────────────

  async enhanceImage(enhancer, params, webhookUrl) {
    const enhancerPaths = {
      "topaz": "/generate/enhance/topaz/standard-enhance",
      "topaz-generative": "/generate/enhance/topaz/generative-enhance",
      "topaz-bloom": "/generate/enhance/topaz/bloom-enhance",
    };
    const path = enhancerPaths[enhancer];
    if (!path) {
      throw new Error(`Unknown enhancer: ${enhancer}. Available: ${Object.keys(enhancerPaths).join(", ")}`);
    }
    return this.request("POST", path, params, webhookUrl);
  }

  // ── Video Generation ──────────────────────────────────

  async generateVideo(model, params, webhookUrl) {
    const modelPaths = {
      "kling-1.0": "/generate/video/kling/kling-1.0",
      "kling-1.5": "/generate/video/kling/kling-1.5",
      "kling-2.5": "/generate/video/kling/kling-2.5",
      "veo-3": "/generate/video/google/veo-3",
      "veo-3.1": "/generate/video/google/veo-3.1",
      "hailuo-2.3": "/generate/video/hailuo/hailuo-2.3",
      "wan-2.5": "/generate/video/alibaba/wan-2.5",
    };
    const path = modelPaths[model];
    if (!path) {
      throw new Error(`Unknown video model: ${model}. Available: ${Object.keys(modelPaths).join(", ")}`);
    }
    return this.request("POST", path, params, webhookUrl);
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
