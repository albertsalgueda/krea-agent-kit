# Krea Agent Kit

Generate images, videos, upscale/enhance with 20+ AI models through the [Krea.ai](https://krea.ai) API.

## Quick Start

Get your API token at [krea.ai/settings/api-tokens](https://krea.ai/settings/api-tokens), then pick your provider:

---

### Claude Code

Paste this in Claude Code:

```
Clone https://github.com/albertsalgueda/krea-agent-kit, run npm install, and add it as an MCP server with my Krea API token: YOUR_API_TOKEN. Then generate an image of a cyberpunk city at night to test it works.
```

### OpenClaw / Codex

Paste this in OpenClaw:

```
Install this skill from https://github.com/albertsalgueda/krea-agent-kit — copy SKILL.md and the scripts/ folder to ~/.codex/skills/krea/. My Krea API key is: YOUR_API_TOKEN — set it as KREA_API_TOKEN environment variable. Then generate an image of a cyberpunk city at night to test it works.
```

### Manual MCP Setup

```bash
git clone https://github.com/albertsalgueda/krea-agent-kit && cd krea-agent-kit && npm install
```

Add to your MCP config (`~/.claude/settings.json` or Claude Desktop config):

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

---

## What's Included

| Component | Description |
|-----------|-------------|
| `src/mcp-server.js` | MCP server (stdio) for Claude Code / Claude Desktop |
| `.claude/skills/krea-api.md` | Claude Code skill with full API reference |
| `src/krea-client.js` | Reusable JavaScript API client |
| `scripts/` | Standalone Python scripts (use `uv run`, no install needed) |

## Available Tools

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

## Examples

```
> Generate a cyberpunk cityscape at night with neon lights
> Create a 5-second video of ocean waves crashing using Veo 3
> Upscale this image to 4K: https://example.com/photo.jpg
> What models are available?
> Train a LoRA style called "my-art-style" using these images: [urls...]
```
