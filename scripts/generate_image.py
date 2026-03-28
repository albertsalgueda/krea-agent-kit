# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""Generate images using the Krea.ai API."""

import argparse
import json
import os
import sys
import time
import requests

API_BASE = "https://api.krea.ai"

KNOWN_MODELS = {
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


def resolve_model(model_arg):
    """Resolve model to endpoint. Accepts a known shorthand, a full endpoint path,
    or a raw model name from the OpenAPI spec (e.g. 'flux-1-dev')."""
    # Known shorthand
    if model_arg in KNOWN_MODELS:
        return KNOWN_MODELS[model_arg]
    # Already a full path
    if model_arg.startswith("/generate/image/"):
        return model_arg
    # Try to match as raw model name from OpenAPI (e.g. flux-1-dev, nano-banana-pro)
    for endpoint in KNOWN_MODELS.values():
        if endpoint.endswith("/" + model_arg):
            return endpoint
    # Last resort: assume it's a valid path segment
    print(f"Warning: Unknown model '{model_arg}', trying as endpoint path", file=sys.stderr)
    return f"/generate/image/{model_arg}"


def get_api_key(args_key):
    key = args_key or os.environ.get("KREA_API_TOKEN")
    if not key:
        print("Error: No API key provided. Set KREA_API_TOKEN or pass --api-key", file=sys.stderr)
        sys.exit(1)
    return key


def poll_job(job_id, api_key, interval=3, timeout=300):
    headers = {"Authorization": f"Bearer {api_key}"}
    start = time.time()
    while time.time() - start < timeout:
        r = requests.get(f"{API_BASE}/jobs/{job_id}", headers=headers)
        r.raise_for_status()
        job = r.json()
        status = job.get("status", "")
        if status == "completed":
            return job
        if status == "failed":
            print(f"Error: Job failed: {json.dumps(job.get('result', {}))}", file=sys.stderr)
            sys.exit(1)
        if status == "cancelled":
            print("Error: Job was cancelled", file=sys.stderr)
            sys.exit(1)
        print(f"  Status: {status}...", file=sys.stderr)
        time.sleep(interval)
    print(f"Error: Job timed out after {timeout}s", file=sys.stderr)
    sys.exit(1)


def download_file(url, filename):
    r = requests.get(url, stream=True)
    r.raise_for_status()
    with open(filename, "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)


def main():
    parser = argparse.ArgumentParser(description="Generate images with Krea AI")
    parser.add_argument("--prompt", required=True, help="Text description")
    parser.add_argument("--filename", required=True, help="Output filename")
    parser.add_argument("--model", default="flux", help="Model ID (e.g. flux, gpt-image), raw name (e.g. flux-1-dev), or full endpoint path")
    parser.add_argument("--width", type=int, help="Width in pixels")
    parser.add_argument("--height", type=int, help="Height in pixels")
    parser.add_argument("--aspect-ratio", help="Aspect ratio (1:1, 16:9, 9:16, etc.)")
    parser.add_argument("--resolution", choices=["1K", "2K", "4K"], help="Resolution (nano-banana models)")
    parser.add_argument("--seed", type=int, help="Random seed")
    parser.add_argument("--steps", type=int, help="Inference steps (flux models)")
    parser.add_argument("--guidance-scale", type=float, help="Guidance scale (flux models)")
    parser.add_argument("--image-url", help="Input image URL for image-to-image")
    parser.add_argument("--style-id", help="LoRA style ID")
    parser.add_argument("--style-strength", type=float, default=1.0, help="LoRA strength (-2 to 2)")
    parser.add_argument("--batch-size", type=int, help="Number of images (1-4)")
    parser.add_argument("--quality", choices=["low", "medium", "high", "auto"], help="Quality (gpt-image)")
    parser.add_argument("--api-key", help="Krea API token")
    args = parser.parse_args()

    api_key = get_api_key(args.api_key)
    endpoint = resolve_model(args.model)

    body = {"prompt": args.prompt}
    if args.width:
        body["width"] = args.width
    if args.height:
        body["height"] = args.height
    if args.aspect_ratio:
        body["aspectRatio"] = args.aspect_ratio
    if args.resolution:
        body["resolution"] = args.resolution
    if args.seed is not None:
        body["seed"] = args.seed
    if args.steps:
        body["steps"] = args.steps
    if args.guidance_scale is not None:
        body["guidance_scale_flux"] = args.guidance_scale
    if args.batch_size:
        body["batchSize"] = args.batch_size
    if args.quality:
        body["quality"] = args.quality

    # Image-to-image
    if args.image_url:
        if args.model.startswith("flux"):
            body["imageUrl"] = args.image_url
        else:
            body["imageUrls"] = [args.image_url]

    # LoRA styles
    if args.style_id:
        body["styles"] = [{"id": args.style_id, "strength": args.style_strength}]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    print(f"Generating image with {args.model}...", file=sys.stderr)
    r = requests.post(f"{API_BASE}{endpoint}", headers=headers, json=body)
    if not r.ok:
        print(f"Error: API returned {r.status_code}: {r.text}", file=sys.stderr)
        sys.exit(1)

    job = r.json()
    job_id = job.get("job_id")
    print(f"Job created: {job_id}", file=sys.stderr)

    result = poll_job(job_id, api_key)
    urls = result.get("result", {}).get("urls", [])

    if not urls:
        print("Error: No image URLs in result", file=sys.stderr)
        sys.exit(1)

    for i, url in enumerate(urls):
        if len(urls) == 1:
            out = args.filename
        else:
            base, ext = os.path.splitext(args.filename)
            out = f"{base}-{i + 1}{ext}"
        download_file(url, out)
        out_path = os.path.abspath(out)
        print(out_path)
        print(f"Saved: {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
