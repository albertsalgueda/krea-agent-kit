# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""Run multi-step Krea AI pipelines. Chain generation, enhancement, and video in one command."""

import argparse
import json
import os
import sys
import time
import requests

API_BASE = "https://api.krea.ai"

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


def resolve(model, models_dict, prefix):
    if model in models_dict:
        return models_dict[model]
    if model.startswith(prefix):
        return model
    for ep in models_dict.values():
        if ep.endswith("/" + model):
            return ep
    return f"{prefix}{model}"


def get_api_key(args_key):
    key = args_key or os.environ.get("KREA_API_TOKEN")
    if not key:
        print("Error: No API key. Set KREA_API_TOKEN or pass --api-key", file=sys.stderr)
        sys.exit(1)
    return key


def api_post(api_key, endpoint, body):
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    r = requests.post(f"{API_BASE}{endpoint}", headers=headers, json=body)
    if not r.ok:
        print(f"Error: API {r.status_code}: {r.text}", file=sys.stderr)
        sys.exit(1)
    return r.json()


def poll_job(api_key, job_id, interval=3, timeout=600):
    headers = {"Authorization": f"Bearer {api_key}"}
    start = time.time()
    while time.time() - start < timeout:
        r = requests.get(f"{API_BASE}/jobs/{job_id}", headers=headers)
        r.raise_for_status()
        job = r.json()
        status = job.get("status", "")
        if status == "completed":
            return job
        if status in ("failed", "cancelled"):
            print(f"Error: Job {status}: {json.dumps(job.get('result', {}))}", file=sys.stderr)
            sys.exit(1)
        print(f"  [{job_id[:8]}] {status}...", file=sys.stderr)
        time.sleep(interval)
    print(f"Error: Job timed out after {timeout}s", file=sys.stderr)
    sys.exit(1)


def download(url, filename):
    r = requests.get(url, stream=True)
    r.raise_for_status()
    with open(filename, "wb") as f:
        for chunk in r.iter_content(8192):
            f.write(chunk)
    return os.path.abspath(filename)


def get_result_url(job):
    """Extract the first result URL from a completed job."""
    urls = job.get("result", {}).get("urls", [])
    if urls:
        return urls[0]
    return job.get("result", {}).get("video_url")


def run_step(api_key, step, step_num, total, prev_urls):
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
        # Use previous result as input image if flagged
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
        # Use previous result as start image
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
        endpoint = resolve(step.get("enhancer", "topaz"), ENHANCERS, "/generate/enhance/")
        # Use previous result as source
        image_url = step.get("image_url")
        if step.get("use_previous") and prev_urls:
            image_url = prev_urls[0]
        if not image_url:
            print("Error: enhance needs image_url or use_previous", file=sys.stderr)
            sys.exit(1)
        body = {"image_url": image_url, "width": step.get("width", 4096), "height": step.get("height", 4096)}
        for k in ("model", "prompt", "creativity", "face_enhancement", "sharpen", "denoise", "output_format"):
            if k in step:
                body[k] = step[k]

        job = api_post(api_key, endpoint, body)
        result = poll_job(api_key, job["job_id"], interval=5)
        result_urls = result.get("result", {}).get("urls", [])

    elif action == "fan_out":
        # Run the same step template for each previous URL (or for each variant in a list)
        sources = prev_urls if step.get("use_previous") else step.get("sources", [])
        sub_template = step.get("step")
        if not sub_template or not sources:
            print("Error: fan_out needs 'step' template and sources", file=sys.stderr)
            sys.exit(1)
        for i, src_url in enumerate(sources):
            print(f"\n  --- fan_out {i + 1}/{len(sources)} ---", file=sys.stderr)
            sub = dict(sub_template)
            # Inject source URL and modify prompt if template has {i} or {n}
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
            # Allow prompt templating
            if "prompt" in sub and "{i}" in sub["prompt"]:
                sub["prompt"] = sub["prompt"].replace("{i}", str(i + 1))
            urls = run_step(api_key, sub, f"{step_num}.{i + 1}", total, [src_url])
            result_urls.extend(urls)

    # Download results
    filenames = []
    base_name = step.get("filename", f"step-{step_num}")
    for i, url in enumerate(result_urls):
        ext = ".mp4" if action == "generate_video" else ".png"
        if len(result_urls) == 1:
            fname = f"{base_name}{ext}" if not base_name.endswith(ext) else base_name
        else:
            fname = f"{base_name}-{i + 1}{ext}"
        path = download(url, fname)
        filenames.append(path)
        print(f"  Saved: {path}", file=sys.stderr)

    print(f"  URLs: {result_urls}", file=sys.stderr)
    return result_urls


def main():
    parser = argparse.ArgumentParser(
        description="Run multi-step Krea AI pipelines",
        epilog="""
Example pipeline JSON:
{
  "steps": [
    {"action": "generate_image", "model": "flux", "prompt": "a red sports car", "filename": "car"},
    {"action": "fan_out", "use_previous": true, "step": {
      "action": "generate_image", "model": "gpt-image", "prompt": "same car, angle {i} of 4, studio lighting",
      "filename": "car-angle"
    }},
    {"action": "fan_out", "use_previous": true, "step": {
      "action": "generate_video", "model": "kling-2.5", "prompt": "the car slowly rotates, cinematic",
      "duration": 5, "filename": "car-video"
    }}
  ]
}
        """,
    )
    parser.add_argument("--pipeline", required=True, help="Path to pipeline JSON file, or inline JSON string")
    parser.add_argument("--api-key", help="Krea API token")
    args = parser.parse_args()

    api_key = get_api_key(args.api_key)

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

    prev_urls = []
    all_results = []

    for i, step in enumerate(steps, 1):
        urls = run_step(api_key, step, i, len(steps), prev_urls)
        prev_urls = urls
        all_results.append({"step": i, "action": step.get("action"), "urls": urls})

    print("\n=== Pipeline Complete ===", file=sys.stderr)
    print(json.dumps(all_results, indent=2))


if __name__ == "__main__":
    main()
