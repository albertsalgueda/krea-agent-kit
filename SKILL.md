# Krea AI — Image, Video & Enhancement Generation

Generate images, videos, upscale/enhance images, and train LoRA styles using the Krea.ai API. Supports 20+ image models (Flux, Imagen, GPT Image, Ideogram, Seedream...), 7 video models (Kling, Veo, Hailuo, Wan), and 3 upscalers (Topaz up to 22K).

**IMPORTANT:** Do NOT invent model names. Before generating, run `list_models.py` to get the live list of available models from the Krea API. The tables below are a reference, but the API may have newer models. Scripts also accept full endpoint paths from `list_models.py --json` output (e.g. `--model /generate/image/google/imagen-4-ultra`).

## Usage

Run scripts using absolute path (do NOT cd to skill directory first):

**Generate image:**
```bash
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "your description" --filename "output.png" [--model flux] [--width 1024] [--height 1024] [--api-key KEY]
```

**Generate video:**
```bash
uv run ~/.codex/skills/krea/scripts/generate_video.py --prompt "your description" --filename "output.mp4" [--model kling-2.5] [--duration 5] [--aspect-ratio 16:9] [--api-key KEY]
```

**Enhance/upscale image:**
```bash
uv run ~/.codex/skills/krea/scripts/enhance_image.py --image-url "https://..." --filename "upscaled.png" --width 4096 --height 4096 [--enhancer topaz] [--api-key KEY]
```

**List available models:**
```bash
uv run ~/.codex/skills/krea/scripts/list_models.py [--type image|video|enhance]
```

**Check job status:**
```bash
uv run ~/.codex/skills/krea/scripts/get_job.py --job-id "uuid" [--api-key KEY]
```

**Important:** Always run from the user's current working directory so files are saved where the user is working.

## Default Workflow (draft → iterate → final)

Goal: fast iteration without burning CU on expensive models until the prompt is right.

- **Draft (cheap/fast):** use `--model z-image` or `--model flux` (3-5 CU, ~5s)
  ```bash
  uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "<draft prompt>" --filename "yyyy-mm-dd-hh-mm-ss-draft.png" --model flux
  ```

- **Iterate:** adjust prompt, keep trying with cheap models

- **Final (high quality):** switch to `--model gpt-image` or `--model nano-banana-pro`
  ```bash
  uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "<final prompt>" --filename "yyyy-mm-dd-hh-mm-ss-final.png" --model nano-banana-pro
  ```

## Image Models (sorted by cost)

| Model | CU | Time | Best for |
|-------|-----|------|----------|
| `z-image` | 3 | ~5s | Fastest, cheapest |
| `flux` | 5 | ~5s | Fast, LoRA support (default) |
| `flux-kontext` | 9 | ~5s | Context-aware editing |
| `qwen` | 9 | ~15s | Good quality, cheap |
| `imagen-4-fast` | 16 | ~17s | Fast Google model |
| `ideogram-2-turbo` | 20 | ~8s | Good typography |
| `seedream-4` | 24 | ~20s | Photorealistic |
| `seedream-5-lite` | 28 | ~20s | Latest Seedream |
| `flux-pro` | 31 | ~11s | High quality Flux |
| `nano-banana` | 32 | ~10s | Balanced |
| `imagen-3` | 32 | ~32s | Google Imagen 3 |
| `imagen-4` | 32 | ~32s | Google Imagen 4 |
| `runway-gen4` | 40 | ~60s | Needs reference images |
| `flux-pro-ultra` | 47 | ~18s | Best Flux |
| `imagen-4-ultra` | 47 | ~30s | Best Imagen |
| `nano-banana-flash` | 48 | ~15s | Fast photorealism |
| `ideogram-3` | 54 | ~18s | Best text rendering |
| `nano-banana-pro` | 119 | ~30s | Superior photorealism |
| `gpt-image` | 184 | ~60s | Highest quality overall |

Map user requests:
- "fast", "quick", "cheap" → `flux` or `z-image`
- "high quality", "best" → `nano-banana-pro` or `gpt-image`
- "text in image", "typography" → `ideogram-3`
- "photorealistic" → `seedream-4` or `nano-banana-pro`
- No preference → `flux`

## Video Models

| Model | CU | Best for |
|-------|-----|----------|
| `kling-1.0` | 282 | Camera control, 5-10s |
| `kling-1.5` | varies | Complex scenes |
| `kling-2.5` | varies | Realistic physics (default) |
| `veo-3` | 608-1281 | Can generate audio |
| `veo-3.1` | varies | Cinematic quality |
| `hailuo-2.3` | varies | Fast, smooth motion |
| `wan-2.5` | 569 | Style control |

Map user requests:
- "fast" → `hailuo-2.3`
- "cinematic", "high quality" → `veo-3.1`
- "with sound", "with audio" → `veo-3` with `--generate-audio`
- No preference → `kling-2.5`

## Enhancers

| Enhancer | CU | Max Resolution | Best for |
|----------|-----|----------------|----------|
| `topaz` | 51 | 22K | Faithful upscaling (default) |
| `topaz-generative` | 137 | 16K | Creative enhancement |
| `topaz-bloom` | 256 | 10K | Adding creative details |

## Image Generation Parameters

| Param | Description | Default |
|-------|-------------|---------|
| `--model` | Model ID from table above | `flux` |
| `--prompt` | Text description (required) | — |
| `--filename` | Output filename (required) | — |
| `--width` | Width in pixels (512-4096) | 1024 |
| `--height` | Height in pixels (512-4096) | 1024 |
| `--aspect-ratio` | Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:2, etc.) | — |
| `--resolution` | 1K, 2K, 4K (nano-banana models) | — |
| `--seed` | Seed for reproducibility | — |
| `--image-url` | Input image URL for image-to-image | — |
| `--style-id` | LoRA style ID to apply | — |
| `--style-strength` | LoRA strength (-2 to 2) | 1.0 |
| `--batch-size` | Number of images (1-4) | 1 |
| `--steps` | Inference steps, 1-100 (flux models) | 25 |
| `--guidance-scale` | Guidance scale, 0-24 (flux models) | 3 |
| `--quality` | low/medium/high/auto (gpt-image) | auto |
| `--api-key` | Krea API token | — |

## Video Generation Parameters

| Param | Description | Default |
|-------|-------------|---------|
| `--model` | Model ID from table above | `kling-2.5` |
| `--prompt` | Text description (required) | — |
| `--filename` | Output filename (required) | — |
| `--duration` | Duration in seconds | 5 |
| `--aspect-ratio` | 16:9, 9:16, 1:1 | 16:9 |
| `--start-image` | URL for image-to-video | — |
| `--end-image` | End frame URL (kling only) | — |
| `--resolution` | 720p, 1080p (veo only) | 720p |
| `--mode` | std, pro (kling only) | std |
| `--generate-audio` | Generate audio (veo-3 only) | false |
| `--api-key` | Krea API token | — |

## Enhancement Parameters

| Param | Description | Default |
|-------|-------------|---------|
| `--enhancer` | topaz, topaz-generative, topaz-bloom | `topaz` |
| `--image-url` | Source image URL (required) | — |
| `--filename` | Output filename (required) | — |
| `--width` | Target width (required) | — |
| `--height` | Target height (required) | — |
| `--enhancer-model` | Sub-model variant | Standard V2 |
| `--creativity` | 1-6 (generative) or 1-9 (bloom) | — |
| `--face-enhancement` | Enable face enhancement | false |
| `--sharpen` | Sharpening 0-1 | — |
| `--denoise` | Denoising 0-1 | — |
| `--api-key` | Krea API token | — |

## API Key

Scripts check for API key in this order:
1. `--api-key` argument (use if user provided key in chat)
2. `KREA_API_TOKEN` environment variable

If neither is available, the script exits with an error message.

## Preflight + Common Failures

**Preflight:**
- `command -v uv` (must exist)
- `test -n "$KREA_API_TOKEN"` (or pass `--api-key`)

**Common failures:**
- `Error: No API key` → set `KREA_API_TOKEN` or pass `--api-key`
- `402 Insufficient credits` → top up compute units at krea.ai
- `429 Too many requests` → concurrent job limit reached, wait and retry
- `Job failed` → check prompt for content moderation issues, try different wording

## Filename Generation

Generate filenames with the pattern: `yyyy-mm-dd-hh-mm-ss-name.ext`

- Timestamp: current date/time in `yyyy-mm-dd-hh-mm-ss` (24h format)
- Name: descriptive lowercase text with hyphens (1-5 words)
- Extension: `.png` for images, `.mp4` for videos

**Examples:**
- Prompt "A cyberpunk cat" → `2025-11-23-14-23-05-cyberpunk-cat.png`
- Prompt "waves on a beach" → `2025-11-23-15-30-12-beach-waves.mp4`

## Prompt Handling

**For generation:** Pass user's description as-is to `--prompt`. Only rework if clearly insufficient.

**For image-to-image:** Use `--image-url` with the source image and describe the desired transformation in `--prompt`.

**For video from image:** Use `--start-image` with the source image and describe the desired motion/action in `--prompt`.

Preserve user's creative intent in all cases.

## Output

- Scripts download the result and save it to the current directory
- Script outputs the full path to the generated file
- **Do not read the image/video back** — just inform the user of the saved path
- If `--batch-size` > 1, files are saved as `name-1.png`, `name-2.png`, etc.

## Examples

**Quick draft image:**
```bash
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "A serene Japanese garden with cherry blossoms" --filename "2025-11-23-14-23-05-japanese-garden.png" --model flux
```

**High quality final:**
```bash
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "A serene Japanese garden with cherry blossoms, golden hour lighting" --filename "2025-11-23-14-25-30-japanese-garden-final.png" --model nano-banana-pro --resolution 4K
```

**Image-to-image edit:**
```bash
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "transform to watercolor painting style" --filename "2025-11-23-14-30-00-watercolor.png" --image-url "https://example.com/photo.jpg" --model nano-banana-pro
```

**Generate video:**
```bash
uv run ~/.codex/skills/krea/scripts/generate_video.py --prompt "A majestic eagle soaring over snow-capped mountains at sunrise" --filename "2025-11-23-15-00-00-eagle-mountains.mp4" --model veo-3 --duration 8 --generate-audio
```

**Upscale image to 4K:**
```bash
uv run ~/.codex/skills/krea/scripts/enhance_image.py --image-url "https://example.com/photo.jpg" --filename "2025-11-23-15-10-00-upscaled.png" --width 4096 --height 4096 --enhancer topaz
```

**List models:**
```bash
uv run ~/.codex/skills/krea/scripts/list_models.py --type image
```

## Workflows

Chain multiple scripts together to create complex creative pipelines. When a script outputs a file path, use that path as input for the next step.

### Generate → Upscale (draft to final)

Generate a draft image cheaply, then upscale the final version:
```bash
# 1. Draft with flux (~5 CU, ~5s)
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "a futuristic Tokyo street at night, neon signs, rain reflections" --filename "tokyo-draft.png" --model flux

# 2. Upscale to 4K with Topaz (~51 CU)
uv run ~/.codex/skills/krea/scripts/enhance_image.py --image-url "file://tokyo-draft.png" --filename "tokyo-4k.png" --width 4096 --height 4096 --enhancer topaz
```

### Generate → Animate (image to video)

Generate a hero image, then bring it to life as a video:
```bash
# 1. Generate high-quality image
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "a majestic dragon perched on a cliff at sunset" --filename "dragon.png" --model nano-banana-pro

# 2. Animate it into a 5s video (use the Krea-hosted URL from step 1 output)
uv run ~/.codex/skills/krea/scripts/generate_video.py --prompt "the dragon spreads its wings and takes flight, camera slowly zooms out" --filename "dragon-flight.mp4" --model kling-2.5 --start-image "RESULT_URL_FROM_STEP_1" --duration 5
```

### Style Transfer → Upscale

Transform a photo into a different style, then upscale:
```bash
# 1. Style transfer with image-to-image
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "transform into Studio Ghibli anime style, soft colors, hand-painted look" --filename "ghibli-version.png" --image-url "https://example.com/photo.jpg" --model gpt-image

# 2. Creative upscale with generative enhancement
uv run ~/.codex/skills/krea/scripts/enhance_image.py --image-url "file://ghibli-version.png" --filename "ghibli-4k.png" --width 4096 --height 4096 --enhancer topaz-generative --creativity 4
```

### Batch Variations → Pick Best → Upscale → Animate

Full creative pipeline:
```bash
# 1. Generate 4 variations cheaply
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "cyberpunk samurai in neon-lit alley" --filename "samurai.png" --model flux --batch-size 4

# 2. User picks their favorite (e.g. samurai-3.png)

# 3. Upscale the chosen one
uv run ~/.codex/skills/krea/scripts/enhance_image.py --image-url "file://samurai-3.png" --filename "samurai-final.png" --width 4096 --height 4096 --enhancer topaz

# 4. Animate it
uv run ~/.codex/skills/krea/scripts/generate_video.py --prompt "the samurai draws their sword, neon lights flicker, slow cinematic camera push-in" --filename "samurai-cinematic.mp4" --model veo-3 --start-image "RESULT_URL" --duration 8 --generate-audio
```

### Multi-angle Product Shots

Generate consistent product imagery from different angles:
```bash
# Front view
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "sleek wireless headphones on white background, front view, product photography, studio lighting" --filename "headphones-front.png" --model gpt-image --seed 42

# Side view (same seed for consistency)
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "sleek wireless headphones on white background, side view, product photography, studio lighting" --filename "headphones-side.png" --model gpt-image --seed 42

# Lifestyle shot
uv run ~/.codex/skills/krea/scripts/generate_image.py --prompt "person wearing sleek wireless headphones, urban environment, golden hour" --filename "headphones-lifestyle.png" --model nano-banana-pro
```

### Workflow tips

- **Use cheap models first** (`flux`, `z-image`) for prompt iteration, switch to expensive models (`gpt-image`, `nano-banana-pro`) only when the prompt is locked
- **Chain image → video**: generate a still frame first, then animate with `--start-image` for much better video results than text-to-video alone
- **Upscale last**: always generate at default resolution and upscale as the final step — it's cheaper and gives better results
- **Use seeds**: set `--seed` to get reproducible results when iterating on prompts
- **Batch for exploration**: use `--batch-size 4` to generate variations and let the user pick
