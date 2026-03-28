# Krea AI Skill

Generate images, videos, upscale/enhance with 20+ AI models through the [Krea.ai](https://krea.ai) API. A **ClawHub/OpenClaw skill** — install and start generating in one command.

## Install in OpenClaw

Paste this prompt in OpenClaw (replace `YOUR_API_TOKEN` with your token from [krea.ai/settings/api-tokens](https://krea.ai/settings/api-tokens)):

```
Install this skill from https://github.com/albertsalgueda/krea-agent-kit — copy SKILL.md and the scripts/ folder to ~/.codex/skills/krea/. My Krea API key is: YOUR_API_TOKEN — set it as KREA_API_TOKEN environment variable. Then generate an image of a cyberpunk city at night to test it works.
```

That's it. OpenClaw will install the skill, set up the API key, and generate a test image.

## Install in Claude Code

Paste this prompt in Claude Code:

```
Fetch the Krea AI skill from https://raw.githubusercontent.com/albertsalgueda/krea-agent-kit/main/SKILL.md and save it to .claude/skills/krea-api.md in this project. Also fetch all Python scripts from https://github.com/albertsalgueda/krea-agent-kit/tree/main/scripts and save them to scripts/krea/. My Krea API key is: YOUR_API_TOKEN — export it as KREA_API_TOKEN. Then generate an image of a cyberpunk city at night to test it works.
```

### Manual install

```bash
mkdir -p ~/.codex/skills/krea
cp SKILL.md ~/.codex/skills/krea/
cp -r scripts ~/.codex/skills/krea/
export KREA_API_TOKEN="your-token-here"
```

Then just ask:
- *"Generate an image of a cyberpunk cat"*
- *"Create a 5-second video of ocean waves"*
- *"Upscale this image to 4K"*
- *"What image models are available?"*
- *"Generate a product shot from 4 angles and make videos of each"*

## Available Scripts

| Script | Description |
|--------|-------------|
| `scripts/generate_image.py` | Generate images with 20+ models (Flux, Imagen, GPT Image, etc.) |
| `scripts/generate_video.py` | Generate videos with Kling, Veo, Hailuo, Wan |
| `scripts/enhance_image.py` | Upscale/enhance with Topaz (up to 22K resolution) |
| `scripts/list_models.py` | List all models live from the API |
| `scripts/pipeline.py` | Multi-step workflows with fan_out, templates, parallel execution |
| `scripts/get_job.py` | Check job status |
| `scripts/krea_helpers.py` | Shared helpers (retry, polling, error handling) |

All scripts use `uv run` (inline dependencies, no install needed).

## Pipeline Examples

Chain steps together — generate, enhance, animate:

```bash
uv run scripts/pipeline.py --pipeline pipeline.json
uv run scripts/pipeline.py --pipeline pipeline.json --dry-run          # estimate CU cost
uv run scripts/pipeline.py --pipeline pipeline.json --resume           # resume interrupted run
uv run scripts/pipeline.py --pipeline template.json --var subject="cat" --var style="cinematic"
```

See `SKILL.md` for full pipeline documentation and examples.

## API Key

Get your token at [krea.ai/settings/api-tokens](https://krea.ai/settings/api-tokens). Set as `KREA_API_TOKEN` environment variable or pass `--api-key` to any script.
