# Krea Agent Kit

Generate images, videos, upscale/enhance with 20+ AI models through the [Krea.ai](https://krea.ai) API. Works as an **OpenClaw/ClawHub skill**, **Claude Code MCP server**, or standalone scripts.

## What's Included

- **ClawHub Skill** (`SKILL.md` + `scripts/`) — Install in OpenClaw and start generating with one command
- **MCP Server (stdio)** (`src/mcp-server.js`) — Local MCP server for Claude Code / Claude Desktop
- **MCP Server (remote)** (`src/mcp-remote.js`) — HTTP MCP server for claude.ai remote integrations
- **Claude Code Skill** (`.claude/skills/krea-api.md`) — Context skill for Claude Code
- **API Client** (`src/krea-client.js`) — Reusable JavaScript client

## Use with OpenClaw / ClawHub

Install the skill from ClawHub, or manually:

```bash
# Copy skill files to OpenClaw skills directory
mkdir -p ~/.codex/skills/krea
cp SKILL.md ~/.codex/skills/krea/
cp -r scripts ~/.codex/skills/krea/
```

Set your API key:
```bash
export KREA_API_TOKEN="your-token-here"
```

Then just ask:
- *"Generate an image of a cyberpunk cat"*
- *"Create a 5-second video of ocean waves"*
- *"Upscale this image to 4K"*
- *"What image models are available?"*

## Available Scripts

| Script | Description |
|--------|-------------|
| `scripts/generate_image.py` | Generate images with 20 models (Flux, Imagen, GPT Image, etc.) |
| `scripts/generate_video.py` | Generate videos with Kling, Veo, Hailuo, Wan |
| `scripts/enhance_image.py` | Upscale/enhance with Topaz (up to 22K resolution) |
| `scripts/list_models.py` | List all models with costs and capabilities |
| `scripts/get_job.py` | Check job status |

All scripts use `uv run` (inline dependencies, no install needed).

---

## Setup (MCP Server)

### 1. Get an API Token

Create a token at [krea.ai/settings/api-tokens](https://krea.ai/settings/api-tokens).

### 2. Install Dependencies

```bash
npm install
```

### 3a. Use with Claude Code / Claude Desktop (stdio)

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

### 3b. Use with claude.ai (remote MCP)

Start the remote server:

```bash
KREA_API_TOKEN=your-token-here node src/mcp-remote.js
# or with a custom port:
KREA_API_TOKEN=your-token-here PORT=8080 node src/mcp-remote.js
```

Then expose it publicly (e.g. with ngrok, Cloudflare Tunnel, or deploy to a server):

```bash
ngrok http 3001
```

In claude.ai, go to **Settings > Integrations > Add Custom Integration** and add:
- **URL**: `https://your-ngrok-url.ngrok.app/mcp`

The server supports both Streamable HTTP (`/mcp`) and legacy SSE (`/sse` + `/messages`).

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_models` | List all models with costs, times, capabilities |
| `generate_image` | Generate images with 20+ models |
| `generate_video` | Generate videos with 7 models |
| `enhance_image` | Upscale/enhance images with Topaz |
| `get_job` / `list_jobs` / `delete_job` | Job management |
| `upload_asset` / `list_assets` / `get_asset` / `delete_asset` | Asset management |
| `train_style` / `list_styles` / `get_style` / `update_style` / `share_style` | LoRA style management |
| `get_node_app` / `execute_node_app` | Custom node apps |

## Quick Examples

```
> Generate a cyberpunk cityscape at night with neon lights
> Create a 5-second video of ocean waves crashing using Veo 3
> Upscale this image to 4K: https://example.com/photo.jpg
> What models are available?
> Train a LoRA style called "my-art-style" using these images: [urls...]
```
