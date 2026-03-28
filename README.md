# Krea Agent Kit

MCP server and Claude Code skill for the [Krea.ai](https://krea.ai) API.

## What's Included

- **MCP Server** (`src/mcp-server.js`) — Full MCP server exposing all Krea API capabilities as tools
- **Claude Code Skill** (`.claude/skills/krea-api.md`) — Comprehensive reference for Claude Code to use the Krea API
- **API Client** (`src/krea-client.js`) — Reusable JavaScript client for the Krea API

## Setup

### 1. Get an API Token

Create a token at [krea.ai/settings/api-tokens](https://krea.ai/settings/api-tokens).

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure MCP Server in Claude Code

Add to your Claude Code settings (`~/.claude/settings.json` or project `.claude/settings.json`):

```json
{
  "mcpServers": {
    "krea": {
      "command": "node",
      "args": ["/path/to/krea-agent-kit/src/mcp-server.js"],
      "env": {
        "KREA_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `generate_image` | Generate images with 20+ models (Flux, Imagen, GPT Image, etc.) |
| `generate_video` | Generate videos with Kling, Veo, Hailuo, Wan models |
| `enhance_image` | Upscale/enhance images with Topaz (up to 22K resolution) |
| `get_job` | Check job status and retrieve results |
| `list_jobs` | List jobs with filtering |
| `delete_job` | Cancel/delete a job |
| `upload_asset` | Upload images, videos, audio, 3D models |
| `list_assets` / `get_asset` / `delete_asset` | Manage uploaded assets |
| `train_style` | Train custom LoRA styles |
| `list_styles` / `get_style` / `update_style` / `share_style` | Manage styles |
| `get_node_app` / `execute_node_app` | Run custom node apps |

## Quick Examples

### Generate an Image

```
> Use Krea to generate a cyberpunk cityscape at night with neon lights
```

Claude will call `generate_image` with model `flux` and your prompt, then poll the job until it completes and return the image URL.

### Generate a Video

```
> Create a 5-second video of ocean waves crashing on rocks at sunset using Veo 3
```

### Upscale an Image

```
> Upscale this image to 4K using Topaz: https://example.com/photo.jpg
```

### Train a Style

```
> Train a LoRA style called "my-art-style" using these 10 images: [urls...]
```
