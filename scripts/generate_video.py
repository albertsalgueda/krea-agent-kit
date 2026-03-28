# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""Generate videos using the Krea.ai API."""

import argparse
import json
import os
import sys
import time
import requests

API_BASE = "https://api.krea.ai"

KNOWN_MODELS = {
    "kling-1.0": "/generate/video/kling/kling-1.0",
    "kling-1.5": "/generate/video/kling/kling-1.5",
    "kling-2.5": "/generate/video/kling/kling-2.5",
    "veo-3": "/generate/video/google/veo-3",
    "veo-3.1": "/generate/video/google/veo-3.1",
    "hailuo-2.3": "/generate/video/hailuo/hailuo-2.3",
    "wan-2.5": "/generate/video/alibaba/wan-2.5",
}


def resolve_model(model_arg):
    """Resolve model to endpoint. Accepts shorthand, full path, or raw name."""
    if model_arg in KNOWN_MODELS:
        return KNOWN_MODELS[model_arg]
    if model_arg.startswith("/generate/video/"):
        return model_arg
    for endpoint in KNOWN_MODELS.values():
        if endpoint.endswith("/" + model_arg):
            return endpoint
    print(f"Warning: Unknown model '{model_arg}', trying as endpoint path", file=sys.stderr)
    return f"/generate/video/{model_arg}"


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
    parser = argparse.ArgumentParser(description="Generate videos with Krea AI")
    parser.add_argument("--prompt", required=True, help="Text description")
    parser.add_argument("--filename", required=True, help="Output filename")
    parser.add_argument("--model", default="kling-2.5", help="Model ID (e.g. kling-2.5, veo-3), raw name, or full endpoint path")
    parser.add_argument("--duration", type=int, help="Duration in seconds")
    parser.add_argument("--aspect-ratio", default="16:9", choices=["16:9", "9:16", "1:1"], help="Aspect ratio")
    parser.add_argument("--start-image", help="Starting image URL for image-to-video")
    parser.add_argument("--end-image", help="End frame image URL (kling only)")
    parser.add_argument("--resolution", choices=["720p", "1080p"], help="Resolution (veo only)")
    parser.add_argument("--mode", choices=["std", "pro"], help="Quality mode (kling only)")
    parser.add_argument("--generate-audio", action="store_true", help="Generate audio (veo-3 only)")
    parser.add_argument("--api-key", help="Krea API token")
    args = parser.parse_args()

    api_key = get_api_key(args.api_key)
    endpoint = resolve_model(args.model)

    body = {"prompt": args.prompt}
    if args.aspect_ratio:
        body["aspectRatio"] = args.aspect_ratio
    if args.duration is not None:
        body["duration"] = args.duration
    if args.start_image:
        body["startImage"] = args.start_image
    if args.end_image:
        body["endImage"] = args.end_image
    if args.resolution:
        body["resolution"] = args.resolution
    if args.mode:
        body["mode"] = args.mode
    if args.generate_audio:
        body["generateAudio"] = True

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    print(f"Generating video with {args.model}...", file=sys.stderr)
    r = requests.post(f"{API_BASE}{endpoint}", headers=headers, json=body)
    if not r.ok:
        print(f"Error: API returned {r.status_code}: {r.text}", file=sys.stderr)
        sys.exit(1)

    job = r.json()
    job_id = job.get("job_id")
    print(f"Job created: {job_id}", file=sys.stderr)

    result = poll_job(job_id, api_key)
    urls = result.get("result", {}).get("urls", [])
    video_url = result.get("result", {}).get("video_url")

    url = (urls[0] if urls else video_url)
    if not url:
        print("Error: No video URL in result", file=sys.stderr)
        sys.exit(1)

    download_file(url, args.filename)
    out_path = os.path.abspath(args.filename)
    print(out_path)
    print(f"Saved: {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
