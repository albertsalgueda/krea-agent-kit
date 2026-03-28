# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""Enhance/upscale images using the Krea.ai API."""

import argparse
import json
import os
import sys
import time
import requests

API_BASE = "https://api.krea.ai"

ENHANCERS = {
    "topaz": "/generate/enhance/topaz/standard-enhance",
    "topaz-generative": "/generate/enhance/topaz/generative-enhance",
    "topaz-bloom": "/generate/enhance/topaz/bloom-enhance",
}


def get_api_key(args_key):
    key = args_key or os.environ.get("KREA_API_TOKEN")
    if not key:
        print("Error: No API key provided. Set KREA_API_TOKEN or pass --api-key", file=sys.stderr)
        sys.exit(1)
    return key


def poll_job(job_id, api_key, interval=5, timeout=600):
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
    parser = argparse.ArgumentParser(description="Enhance/upscale images with Krea AI")
    parser.add_argument("--image-url", required=True, help="Source image URL")
    parser.add_argument("--filename", required=True, help="Output filename")
    parser.add_argument("--width", type=int, required=True, help="Target width")
    parser.add_argument("--height", type=int, required=True, help="Target height")
    parser.add_argument("--enhancer", default="topaz", choices=list(ENHANCERS.keys()), help="Enhancer to use")
    parser.add_argument("--enhancer-model", help="Sub-model (e.g. 'Standard V2', 'Redefine', 'Reimagine')")
    parser.add_argument("--prompt", help="Enhancement guidance prompt")
    parser.add_argument("--creativity", type=int, help="Creativity level (generative: 1-6, bloom: 1-9)")
    parser.add_argument("--face-enhancement", action="store_true", help="Enable face enhancement")
    parser.add_argument("--sharpen", type=float, help="Sharpening 0-1")
    parser.add_argument("--denoise", type=float, help="Denoising 0-1")
    parser.add_argument("--scaling-factor", type=int, help="Upscaling factor 1-32")
    parser.add_argument("--output-format", choices=["png", "jpg", "webp"], help="Output format")
    parser.add_argument("--api-key", help="Krea API token")
    args = parser.parse_args()

    api_key = get_api_key(args.api_key)
    endpoint = ENHANCERS[args.enhancer]

    body = {
        "image_url": args.image_url,
        "width": args.width,
        "height": args.height,
    }
    if args.enhancer_model:
        body["model"] = args.enhancer_model
    if args.prompt:
        body["prompt"] = args.prompt
    if args.creativity is not None:
        body["creativity"] = args.creativity
    if args.face_enhancement:
        body["face_enhancement"] = True
    if args.sharpen is not None:
        body["sharpen"] = args.sharpen
    if args.denoise is not None:
        body["denoise"] = args.denoise
    if args.scaling_factor is not None:
        body["image_scaling_factor"] = args.scaling_factor
        body["upscaling_activated"] = True
    if args.output_format:
        body["output_format"] = args.output_format

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    print(f"Enhancing image with {args.enhancer}...", file=sys.stderr)
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
        print("Error: No image URL in result", file=sys.stderr)
        sys.exit(1)

    download_file(urls[0], args.filename)
    out_path = os.path.abspath(args.filename)
    print(out_path)
    print(f"Saved: {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
