# Krea Agent Kit

MCP server and Claude Code skill for the [Krea.ai](https://krea.ai) API.

## What's Included

- **MCP Server (stdio)** (`src/mcp-server.js`) — Local MCP server for Claude Code / Claude Desktop
- **MCP Server (remote)** (`src/mcp-remote.js`) — HTTP MCP server for claude.ai and remote clients
- **Claude Code Skill** (`.claude/skills/krea-api.md`) — Comprehensive reference for Claude Code to use the Krea API
- **API Client** (`src/krea-client.js`) — Reusable JavaScript client for the Krea API

## Use with Claude.ai (copy & paste)

No code needed. Just paste a prompt into a Claude.ai Project and start generating.

**[See CLAUDE_AI_SKILL.md for the full prompt and instructions](./CLAUDE_AI_SKILL.md)**

1. Create a Project on [claude.ai](https://claude.ai)
2. Paste the prompt from `CLAUDE_AI_SKILL.md` into **Custom Instructions**
3. Replace `YOUR_API_TOKEN` with your token from [krea.ai/settings/api-tokens](https://krea.ai/settings/api-tokens)
4. Chat: *"Generate an image of a futuristic city"*

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

In claude.ai, go to **Settings > Integrations > Add MCP Server** and add:
- **URL**: `https://your-ngrok-url.ngrok.app/mcp`

The server supports both Streamable HTTP (`/mcp`) and legacy SSE (`/sse` + `/messages`).

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
