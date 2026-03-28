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

**Run a multi-step pipeline:**
```bash
uv run ~/.codex/skills/krea/scripts/pipeline.py --pipeline pipeline.json [--api-key KEY]
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
- `402 Insufficient credits` → top up compute units at https://krea.ai/settings/billing
- `402 This model requires a higher plan` → model needs a paid plan upgrade at https://krea.ai/settings/billing
- `429 Too many requests` → concurrent job limit reached; scripts auto-retry up to 3 times with backoff
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

## Pipelines (Multi-Step Workflows)

Use `pipeline.py` to chain multiple steps automatically. Each step's output feeds into the next. Write a JSON pipeline and run it in one command.

### Pipeline JSON Format

```json
{
  "steps": [
    {
      "action": "generate_image | generate_video | enhance | fan_out",
      "model": "model-id",
      "prompt": "...",
      "filename": "base-name",
      "use_previous": true,
      "...": "any other model-specific params"
    }
  ]
}
```

**Actions:**
- `generate_image` — generate an image
- `generate_video` — generate a video
- `enhance` — upscale/enhance an image
- `fan_out` — run a sub-step for EACH result from the previous step (branching)

**Special fields:**
- `use_previous: true` — use the output URL(s) from the previous step as input
- `fan_out` has a `step` field containing the template to run per source URL
- In fan_out prompts, `{i}` is replaced with the iteration number (1, 2, 3...)

### Example: Generate → 4 Angles → 4 Videos

Generate a concept image, create 4 angle variations, then animate each one:

```json
{
  "steps": [
    {
      "action": "generate_image",
      "model": "flux",
      "prompt": "a red sports car on an empty highway, golden hour, cinematic",
      "filename": "car-concept"
    },
    {
      "action": "fan_out",
      "use_previous": true,
      "step": {
        "action": "generate_image",
        "model": "gpt-image",
        "prompt": "same red sports car, angle {i} of 4: front three-quarter view at angle {i}, professional automotive photography, studio lighting, white background",
        "filename": "car-angle-{i}"
      }
    },
    {
      "action": "fan_out",
      "use_previous": true,
      "step": {
        "action": "generate_video",
        "model": "kling-2.5",
        "prompt": "the red sports car slowly rotates on a turntable, smooth motion, studio lighting",
        "duration": 5,
        "filename": "car-spin-{i}"
      }
    }
  ]
}
```

Run it:
```bash
uv run ~/.codex/skills/krea/scripts/pipeline.py --pipeline car-pipeline.json
```

### Example: Generate → Upscale → Animate with Audio

```json
{
  "steps": [
    {
      "action": "generate_image",
      "model": "nano-banana-pro",
      "prompt": "a majestic dragon perched on a cliff overlooking a stormy ocean",
      "filename": "dragon"
    },
    {
      "action": "enhance",
      "use_previous": true,
      "enhancer": "topaz-generative",
      "width": 4096,
      "height": 4096,
      "creativity": 3,
      "filename": "dragon-4k"
    },
    {
      "action": "generate_video",
      "use_previous": true,
      "model": "veo-3",
      "prompt": "the dragon spreads its wings and roars, lightning strikes, waves crash below, epic cinematic",
      "duration": 8,
      "generateAudio": true,
      "filename": "dragon-epic"
    }
  ]
}
```

### Example: Product Photography Pipeline

Generate hero shot → 4 style variations → upscale all:

```json
{
  "steps": [
    {
      "action": "generate_image",
      "model": "gpt-image",
      "prompt": "minimalist perfume bottle, frosted glass, on marble surface, soft studio lighting, product photography",
      "quality": "high",
      "filename": "perfume-hero"
    },
    {
      "action": "fan_out",
      "use_previous": true,
      "step": {
        "action": "generate_image",
        "model": "gpt-image",
        "prompt": "same perfume bottle, variation {i}: 1=morning light with flowers, 2=dark moody with smoke, 3=underwater with bubbles, 4=floating in clouds",
        "filename": "perfume-mood-{i}"
      }
    },
    {
      "action": "fan_out",
      "use_previous": true,
      "step": {
        "action": "enhance",
        "enhancer": "topaz",
        "width": 4096,
        "height": 4096,
        "filename": "perfume-final-{i}"
      }
    }
  ]
}
```

### Example: Inline Pipeline (no JSON file needed)

For quick pipelines, pass JSON directly:
```bash
uv run ~/.codex/skills/krea/scripts/pipeline.py --pipeline '{"steps":[{"action":"generate_image","model":"flux","prompt":"a cat astronaut","filename":"cat"},{"action":"enhance","use_previous":true,"enhancer":"topaz","width":4096,"height":4096,"filename":"cat-4k"}]}'
```

### Building Pipelines for Users

When a user asks for something complex like "generate a product shot from 4 angles and make videos of each":

1. Write a pipeline JSON with the right steps
2. Save it to a `.json` file in the current directory
3. Run it with `pipeline.py --pipeline file.json`
4. Show the user the saved file paths when done

**Tips:**
- Use `fan_out` to branch — it runs the sub-step once per result from the previous step
- `use_previous: true` chains steps automatically
- Start cheap (`flux`) for concept, switch to quality (`gpt-image`, `nano-banana-pro`) for finals
- Upscale as the last step before video — cheaper and better quality
- Use `{i}` in prompts inside `fan_out` to vary the prompt per iteration
