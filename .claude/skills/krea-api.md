# Krea API Skill

TRIGGER when: the user asks to generate images, generate videos, upscale/enhance images, train styles/LoRAs, or manage assets using Krea AI. Also trigger when user mentions "krea", "krea api", or wants AI image/video generation.

DO NOT TRIGGER when: the user is working with other AI APIs (OpenAI directly, Stability AI, Midjourney), or general coding tasks unrelated to media generation.

## Overview

Krea.ai provides a unified API for AI image generation, video generation, image enhancement, style/LoRA training, and asset management. Base URL: `https://api.krea.ai`. Auth: `Authorization: Bearer $KREA_API_TOKEN`.

All generation endpoints are **asynchronous** — they return a `job_id` immediately. Poll `GET /jobs/{job_id}` every 2-5 seconds until `status` is `completed`, `failed`, or `cancelled`. Alternatively, pass `X-Webhook-URL` header to receive a POST callback on completion.

## Authentication

API tokens are created at https://krea.ai/settings/api-tokens. Set the environment variable `KREA_API_TOKEN`.

## MCP Server

This project includes an MCP server at `src/mcp-server.js`. To use it, add to your Claude Code MCP config:

```json
{
  "mcpServers": {
    "krea": {
      "command": "node",
      "args": ["src/mcp-server.js"],
      "env": { "KREA_API_TOKEN": "your-token-here" }
    }
  }
}
```

Available MCP tools: `generate_image`, `generate_video`, `enhance_image`, `get_job`, `list_jobs`, `delete_job`, `upload_asset`, `list_assets`, `get_asset`, `delete_asset`, `train_style`, `list_styles`, `get_style`, `update_style`, `share_style`, `get_node_app`, `execute_node_app`.

## Image Generation

### Endpoint Pattern
`POST /generate/image/{provider}/{model}`

**Models are dynamic.** Call `list_models` (MCP tool) or run `scripts/list_models.py` to see currently available image models with their costs and capabilities.

### Common Parameters
```json
{
  "prompt": "required - text description",
  "width": 1024,       // 512-4096 depending on model
  "height": 1024,      // 512-4096 depending on model
  "seed": 12345,       // optional, for reproducibility
  "batchSize": 1,      // 1-4, some models only
  "imageUrl": "url",   // for image-to-image (flux)
  "imageUrls": ["url"],// for image-to-image (other models)
  "styleImages": [{"url": "...", "strength": 1.0}], // style refs
  "styles": [{"id": "lora-id", "strength": 1.0}]    // LoRA styles
}
```

### Flux-specific Parameters
- `steps`: 1-100 (default 25)
- `guidance_scale_flux`: 0-24 (default 3)
- `strength`: overall strength modifier
- `imageStyleRefs`: style reference images

### Google/Nano Banana Parameters
- `aspectRatio`: "21:9", "1:1", "4:3", "3:2", "2:3", "5:4", "4:5", "3:4", "16:9", "9:16"
- `resolution`: "1K", "2K", "4K"

### GPT Image Parameters
- `quality`: "low", "medium", "high", "auto"
- `backgroundImage`: "transparent", "opaque", "auto"

### Example: Text-to-Image
```bash
curl -X POST https://api.krea.ai/generate/image/bfl/flux-1-dev \
  -H "Authorization: Bearer $KREA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a serene mountain landscape at sunset", "width": 1024, "height": 1024}'
```

### Example: Image-to-Image
```bash
curl -X POST https://api.krea.ai/generate/image/google/nano-banana-pro \
  -H "Authorization: Bearer $KREA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "transform to watercolor style", "imageUrls": ["https://example.com/photo.jpg"]}'
```

## Video Generation

### Endpoint Pattern
`POST /generate/video/{provider}/{model}`

**Models are dynamic.** Call `list_models` (MCP tool) or run `scripts/list_models.py --type video` to see currently available video models.

### Video Parameters
```json
{
  "prompt": "required - describe the video",
  "startImage": "url",         // image-to-video
  "endImage": "url",           // end frame (kling only)
  "aspectRatio": "16:9",       // 16:9, 9:16, 1:1
  "duration": 5,               // seconds (model dependent)
  "resolution": "720p",        // 720p, 1080p (veo)
  "mode": "std",               // std, pro (kling)
  "generateAudio": false,      // veo-3 only
  "cameraControl": {           // kling only
    "type": "simple",
    "config": {"zoom": 5, "pan": -3}
  }
}
```

### Kling Camera Control Types
- `simple`: with config `{zoom, roll, pan, tilt, vertical, horizontal}` each -10 to 10
- `down_back`, `forward_up`, `right_turn_forward`, `left_turn_forward`: no config needed

### Example: Text-to-Video
```bash
curl -X POST https://api.krea.ai/generate/video/google/veo-3 \
  -H "Authorization: Bearer $KREA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a majestic eagle soaring over mountains", "duration": 8, "aspectRatio": "16:9"}'
```

## Image Enhancement / Upscaling

### Endpoint Pattern
`POST /generate/enhance/{provider}/{model}`

**Enhancers are dynamic.** Call `list_models` (MCP tool) or run `scripts/list_models.py --type enhance` to see currently available enhancers.

### Topaz Standard Parameters
```json
{
  "image_url": "required",
  "width": 4096, "height": 4096,
  "model": "Standard V2",  // Standard V2, Low Resolution V2, CGI, High Fidelity V2, Text Refine
  "sharpen": 0.5, "denoise": 0.3, "fix_compression": 0.5,
  "face_enhancement": true,
  "upscaling_activated": true,
  "image_scaling_factor": 4
}
```

### Topaz Generative Parameters
```json
{
  "image_url": "required",
  "width": 4096, "height": 4096,
  "model": "Redefine",  // Redefine, Recovery, Recovery V2, Reimagine
  "prompt": "optional enhancement guidance",
  "creativity": 3,      // 1-6
  "texture": 3,         // 1-5
  "face_enhancement": true,
  "face_enhancement_creativity": 0.5,  // 0-1
  "face_enhancement_strength": 0.5,    // 0-1
  "output_format": "png"               // png, jpg, webp
}
```

### Topaz Bloom Parameters
```json
{
  "image_url": "required",
  "width": 4096, "height": 4096,
  "model": "Reimagine",
  "creativity": 5,           // 1-9
  "face_preservation": 0.5,
  "color_preservation": 0.5
}
```

## Style / LoRA Training

### Train: `POST /styles/train`
```json
{
  "model": "flux_dev",          // flux_dev, flux_schnell, wan, wan22, qwen, z-image
  "type": "Style",              // Style, Object, Character, Default
  "name": "My Custom Style",
  "urls": ["img1.jpg", "img2.jpg", "..."],  // 3-2000 training images
  "trigger_word": "mystyle",
  "learning_rate": 0.0001,
  "max_train_steps": 1000,
  "batch_size": 1
}
```

### Other Style Endpoints
- `GET /styles` — search/list styles (params: cursor, limit, ids, liked, user, model, filter)
- `GET /styles/{id}` — get style details
- `PATCH /styles/{id}` — update style (public, title, cover_url, urls)
- `GET /styles/{id}/share/link` — get shareable link
- `POST /styles/{id}/share/workspace` — share to workspace
- `DELETE /styles/{id}/share/workspace` — unshare from workspace

## Asset Management

- `POST /assets` — upload file (multipart/form-data, max 75MB). Supports: JPEG, PNG, WebP, HEIC, MP4, MOV, WebM, GLB, WAV, MP3
- `GET /assets` — list assets (params: cursor, limit)
- `GET /assets/{id}` — get asset
- `DELETE /assets/{id}` — delete asset

## Job Management

- `GET /jobs/{id}` — get job status and result
- `GET /jobs` — list jobs (params: cursor, limit, types, status)
- `DELETE /jobs/{id}` — cancel/delete job

### Job Statuses
`backlogged` → `queued` → `scheduled` → `processing` → `sampling` → `intermediate-complete` → `completed`
Also: `failed`, `cancelled`

### Job Response (completed)
```json
{
  "job_id": "uuid",
  "status": "completed",
  "created_at": "2026-01-15T10:30:00.000Z",
  "completed_at": "2026-01-15T10:30:05.000Z",
  "result": {
    "urls": ["https://app-uploads.krea.ai/...image.png"]
  }
}
```

## Node Apps

- `GET /node-apps/{id}` — get node app details and schemas
- `POST /node-apps/{id}/execute` — execute with custom input params

## Webhooks

Add `X-Webhook-URL` header to any generation request. The API sends a POST to your URL when the job reaches a terminal state with the full job data. Return 2xx promptly.

## Error Codes
- `400` — Invalid request parameters
- `401` — Missing/invalid API token
- `402` — Insufficient compute units
- `429` — Concurrent job limit exceeded

Failed and cancelled jobs do NOT consume compute units.

## Best Practices
1. Call `list_models` first to see available models sorted by cost — pick the cheapest that fits your needs
2. Poll every 2-5s for images, 5-10s for videos
3. Use webhooks for production to avoid polling overhead
4. Use styles/LoRAs to maintain visual consistency across generations
5. Batch requests within rate limits; excess jobs auto-queue in backlog
