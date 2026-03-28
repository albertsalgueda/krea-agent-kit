# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""Run multi-step Krea AI pipelines. Chain generation, enhancement, and video in one command."""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from krea_helpers import (
    get_api_key, api_post, poll_job, download_file, output_path,
    get_cu_estimate, ensure_image_url,
)

IMAGE_MODELS = {
    "z-image": "/generate/image/z-image/z-image",
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
}

VIDEO_MODELS = {
    "kling-1.0": "/generate/video/kling/kling-1.0",
    "kling-1.5": "/generate/video/kling/kling-1.5",
    "kling-2.5": "/generate/video/kling/kling-2.5",
    "veo-3": "/generate/video/google/veo-3",
    "veo-3.1": "/generate/video/google/veo-3.1",
    "hailuo-2.3": "/generate/video/hailuo/hailuo-2.3",
    "wan-2.5": "/generate/video/alibaba/wan-2.5",
}

ENHANCERS = {
    "topaz": "/generate/enhance/topaz/standard-enhance",
    "topaz-generative": "/generate/enhance/topaz/generative-enhance",
    "topaz-bloom": "/generate/enhance/topaz/bloom-enhance",
}

DEFAULT_ENHANCER_MODELS = {
    "topaz": "Standard V2",
    "topaz-generative": "Redefine",
    "topaz-bloom": "Reimagine",
}


def resolve(model, models_dict, prefix):
    if model in models_dict:
        return models_dict[model]
    if model.startswith(prefix):
        return model
    for ep in models_dict.values():
        if ep.endswith("/" + model):
            return ep
    return f"{prefix}{model}"


def get_result_url(job):
    urls = job.get("result", {}).get("urls", [])
    if urls:
        return urls[0]
    return job.get("result", {}).get("video_url")


# ── Validation ───────────────────────────────────────────

VALID_ACTIONS = {"generate_image", "generate_video", "enhance", "fan_out"}

REQUIRED_FIELDS = {
    "generate_image": ["prompt"],
    "generate_video": ["prompt"],
    "enhance": [],  # image_url or use_previous required
    "fan_out": ["step"],
}


def validate_pipeline(steps):
    """Validate pipeline JSON before executing. Exits on error."""
    errors = []
    for i, step in enumerate(steps, 1):
        action = step.get("action")
        if not action:
            errors.append(f"Step {i}: missing 'action' field")
            continue
        if action not in VALID_ACTIONS:
            errors.append(f"Step {i}: invalid action '{action}'. Must be one of: {', '.join(VALID_ACTIONS)}")
            continue

        for field in REQUIRED_FIELDS.get(action, []):
            if field not in step:
                errors.append(f"Step {i} ({action}): missing required field '{field}'")

        if action == "enhance":
            if not step.get("use_previous") and not step.get("image_url"):
                errors.append(f"Step {i} (enhance): needs 'image_url' or 'use_previous: true'")
            if not step.get("use_previous"):
                if not step.get("width") or not step.get("height"):
                    errors.append(f"Step {i} (enhance): needs 'width' and 'height'")

        if step.get("use_previous") and i == 1:
            errors.append(f"Step {i}: 'use_previous' cannot be used on the first step")

        if action == "fan_out":
            if not step.get("use_previous") and not step.get("sources"):
                errors.append(f"Step {i} (fan_out): needs 'use_previous: true' or 'sources' list")
            sub = step.get("step", {})
            sub_action = sub.get("action")
            if sub_action and sub_action not in VALID_ACTIONS:
                errors.append(f"Step {i} (fan_out): sub-step has invalid action '{sub_action}'")

    if errors:
        print("Pipeline validation failed:", file=sys.stderr)
        for e in errors:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)


# ── Dry-run CU estimation ───────────────────────────────

def estimate_cu(steps, fan_out_multiplier=4):
    """Estimate total CU cost. fan_out_multiplier is assumed count of sources."""
    total = 0
    unknown = []
    for i, step in enumerate(steps, 1):
        action = step.get("action", "generate_image")
        if action == "fan_out":
            sub = step.get("step", {})
            sub_action = sub.get("action", "generate_image")
            model = sub.get("model") or sub.get("enhancer", "topaz")
            cu = get_cu_estimate(sub_action, model)
            if cu is not None:
                step_cu = cu * fan_out_multiplier
                total += step_cu
                print(f"  Step {i} (fan_out × ~{fan_out_multiplier}): {sub_action} [{model}] ~{cu} × {fan_out_multiplier} = ~{step_cu} CU", file=sys.stderr)
            else:
                unknown.append(f"Step {i} fan_out [{model}]")
                print(f"  Step {i} (fan_out × ~{fan_out_multiplier}): {sub_action} [{model}] = ? CU (unknown)", file=sys.stderr)
        else:
            model = step.get("model") or step.get("enhancer", "topaz")
            cu = get_cu_estimate(action, model)
            if cu is not None:
                total += cu
                print(f"  Step {i}: {action} [{model}] ~{cu} CU", file=sys.stderr)
            else:
                unknown.append(f"Step {i} [{model}]")
                print(f"  Step {i}: {action} [{model}] = ? CU (unknown)", file=sys.stderr)

    print(f"\n  Estimated total: ~{total} CU", file=sys.stderr)
    if unknown:
        print(f"  (Unknown costs for: {', '.join(unknown)})", file=sys.stderr)
    return total


# ── Step execution ───────────────────────────────────────

def run_step(api_key, step, step_num, total, prev_urls, out_dir=None):
    """Execute a single pipeline step. Returns list of result URLs."""
    action = step.get("action", "generate_image")
    print(f"\n=== Step {step_num}/{total}: {action} ===", file=sys.stderr)

    result_urls = []

    if action == "generate_image":
        endpoint = resolve(step.get("model", "flux"), IMAGE_MODELS, "/generate/image/")
        body = {"prompt": step["prompt"]}
        for k in ("width", "height", "seed", "steps", "batchSize", "quality", "aspectRatio", "resolution"):
            if k in step:
                body[k] = step[k]
        if "guidance_scale" in step:
            body["guidance_scale_flux"] = step["guidance_scale"]
        if step.get("use_previous") and prev_urls:
            if step.get("model", "flux").startswith("flux"):
                body["imageUrl"] = prev_urls[0]
            else:
                body["imageUrls"] = [prev_urls[0]]
        elif "imageUrl" in step:
            body["imageUrl"] = step["imageUrl"]
        elif "imageUrls" in step:
            body["imageUrls"] = step["imageUrls"]
        if "styles" in step:
            body["styles"] = step["styles"]

        job = api_post(api_key, endpoint, body)
        result = poll_job(api_key, job["job_id"])
        result_urls = result.get("result", {}).get("urls", [])

    elif action == "generate_video":
        endpoint = resolve(step.get("model", "kling-2.5"), VIDEO_MODELS, "/generate/video/")
        body = {"prompt": step["prompt"]}
        for k in ("duration", "aspectRatio", "resolution", "mode", "generateAudio"):
            if k in step:
                body[k] = step[k]
        if step.get("use_previous") and prev_urls:
            body["startImage"] = prev_urls[0]
        elif "startImage" in step:
            body["startImage"] = step["startImage"]
        if "endImage" in step:
            body["endImage"] = step["endImage"]

        job = api_post(api_key, endpoint, body)
        result = poll_job(api_key, job["job_id"], interval=5)
        url = get_result_url(result)
        if url:
            result_urls = [url]

    elif action == "enhance":
        enhancer_name = step.get("enhancer", "topaz")
        endpoint = resolve(enhancer_name, ENHANCERS, "/generate/enhance/")
        image_url = step.get("image_url")
        if step.get("use_previous") and prev_urls:
            image_url = prev_urls[0]
        if not image_url:
            print("Error: enhance needs image_url or use_previous", file=sys.stderr)
            sys.exit(1)
        body = {
            "image_url": image_url,
            "width": step.get("width", 4096),
            "height": step.get("height", 4096),
            "model": step.get("model", DEFAULT_ENHANCER_MODELS.get(enhancer_name, "Standard V2")),
        }
        for k in ("prompt", "creativity", "face_enhancement", "sharpen", "denoise", "output_format"):
            if k in step:
                body[k] = step[k]

        job = api_post(api_key, endpoint, body)
        result = poll_job(api_key, job["job_id"], interval=5)
        result_urls = result.get("result", {}).get("urls", [])

    elif action == "fan_out":
        sources = prev_urls if step.get("use_previous") else step.get("sources", [])
        sub_template = step.get("step")
        if not sub_template or not sources:
            print("Error: fan_out needs 'step' template and sources", file=sys.stderr)
            sys.exit(1)
        for i, src_url in enumerate(sources):
            print(f"\n  --- fan_out {i + 1}/{len(sources)} ---", file=sys.stderr)
            sub = dict(sub_template)
            sub["use_previous"] = False
            if sub.get("action") == "generate_image":
                if sub.get("model", "flux").startswith("flux"):
                    sub["imageUrl"] = src_url
                else:
                    sub["imageUrls"] = [src_url]
            elif sub.get("action") == "generate_video":
                sub["startImage"] = src_url
            elif sub.get("action") == "enhance":
                sub["image_url"] = src_url
            if "prompt" in sub and "{i}" in sub["prompt"]:
                sub["prompt"] = sub["prompt"].replace("{i}", str(i + 1))
            if "filename" in sub and "{i}" in sub["filename"]:
                sub["filename"] = sub["filename"].replace("{i}", str(i + 1))
            urls = run_step(api_key, sub, f"{step_num}.{i + 1}", total, [src_url], out_dir)
            result_urls.extend(urls)

    # Download results
    base_name = step.get("filename", f"step-{step_num}")
    for i, url in enumerate(result_urls):
        ext = ".mp4" if action == "generate_video" else ".png"
        if len(result_urls) == 1:
            fname = f"{base_name}{ext}" if not base_name.endswith(ext) else base_name
        else:
            fname = f"{base_name}-{i + 1}{ext}"
        path = download_file(url, output_path(fname, out_dir))
        print(f"  Saved: {path}", file=sys.stderr)

    print(f"  URLs: {result_urls}", file=sys.stderr)
    return result_urls


def main():
    parser = argparse.ArgumentParser(
        description="Run multi-step Krea AI pipelines",
        epilog='Example: pipeline.py --pipeline \'{"steps":[{"action":"generate_image","model":"flux","prompt":"a cat","filename":"cat"}]}\'',
    )
    parser.add_argument("--pipeline", required=True, help="Path to pipeline JSON file, or inline JSON string")
    parser.add_argument("--api-key", help="Krea API token")
    parser.add_argument("--dry-run", action="store_true", help="Estimate CU cost without executing")
    parser.add_argument("--resume", action="store_true", help="Skip steps whose output files already exist")
    parser.add_argument("--output-dir", help="Output directory for all generated files")
    args = parser.parse_args()

    # Load pipeline
    if os.path.isfile(args.pipeline):
        with open(args.pipeline) as f:
            pipeline = json.load(f)
    else:
        pipeline = json.loads(args.pipeline)

    steps = pipeline.get("steps", [])
    if not steps:
        print("Error: Pipeline has no steps", file=sys.stderr)
        sys.exit(1)

    # Validate
    validate_pipeline(steps)

    # Dry-run mode
    if args.dry_run:
        print("\n=== Dry Run: CU Cost Estimate ===\n", file=sys.stderr)
        estimate_cu(steps)
        return

    api_key = get_api_key(args.api_key)
    prev_urls = []
    all_results = []

    for i, step in enumerate(steps, 1):
        # Resume: check if outputs already exist
        if args.resume:
            base_name = step.get("filename", f"step-{i}")
            action = step.get("action", "generate_image")
            ext = ".mp4" if action == "generate_video" else ".png"
            fname = f"{base_name}{ext}" if not base_name.endswith(ext) else base_name
            check_path = output_path(fname, args.output_dir)
            if os.path.isfile(check_path):
                print(f"\n[Step {i}] Skipping — output exists: {check_path}", file=sys.stderr)
                # We don't have the URLs from the previous run, so skip steps that depend on them
                all_results.append({"step": i, "action": step.get("action"), "skipped": True, "file": check_path})
                prev_urls = []  # Can't chain from skipped steps
                continue

        urls = run_step(api_key, step, i, len(steps), prev_urls, args.output_dir)
        prev_urls = urls
        all_results.append({"step": i, "action": step.get("action"), "urls": urls})

    print("\n=== Pipeline Complete ===", file=sys.stderr)
    print(json.dumps(all_results, indent=2))


if __name__ == "__main__":
    main()
