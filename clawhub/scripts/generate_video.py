# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""Generate videos using the Krea.ai API."""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from krea_helpers import get_api_key, api_post, poll_job, download_file, ensure_image_url, output_path

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
    if model_arg in KNOWN_MODELS:
        return KNOWN_MODELS[model_arg]
    if model_arg.startswith("/generate/video/"):
        return model_arg
    for endpoint in KNOWN_MODELS.values():
        if endpoint.endswith("/" + model_arg):
            return endpoint
    print(f"Warning: Unknown model '{model_arg}', trying as endpoint path", file=sys.stderr)
    return f"/generate/video/{model_arg}"


def main():
    parser = argparse.ArgumentParser(description="Generate videos with Krea AI")
    parser.add_argument("--prompt", required=True, help="Text description")
    parser.add_argument("--filename", required=True, help="Output filename")
    parser.add_argument("--model", default="kling-2.5", help="Model ID, raw name, or full endpoint path")
    parser.add_argument("--duration", type=int, help="Duration in seconds")
    parser.add_argument("--aspect-ratio", default="16:9", choices=["16:9", "9:16", "1:1"], help="Aspect ratio")
    parser.add_argument("--start-image", help="Starting image URL or local file path for image-to-video")
    parser.add_argument("--end-image", help="End frame image URL (kling only)")
    parser.add_argument("--resolution", choices=["720p", "1080p"], help="Resolution (veo only)")
    parser.add_argument("--mode", choices=["std", "pro"], help="Quality mode (kling only)")
    parser.add_argument("--generate-audio", action="store_true", help="Generate audio (veo-3 only)")
    parser.add_argument("--output-dir", help="Output directory (default: cwd)")
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
        body["startImage"] = ensure_image_url(args.start_image, api_key)
    if args.end_image:
        body["endImage"] = ensure_image_url(args.end_image, api_key)
    if args.resolution:
        body["resolution"] = args.resolution
    if args.mode:
        body["mode"] = args.mode
    if args.generate_audio:
        body["generateAudio"] = True

    print(f"Generating video with {args.model}...", file=sys.stderr)
    job = api_post(api_key, endpoint, body)
    job_id = job.get("job_id")
    print(f"Job created: {job_id}", file=sys.stderr)

    result = poll_job(api_key, job_id, interval=5)
    urls = result.get("result", {}).get("urls", [])
    video_url = result.get("result", {}).get("video_url")

    url = (urls[0] if urls else video_url)
    if not url:
        print("Error: No video URL in result", file=sys.stderr)
        sys.exit(1)

    out = output_path(args.filename, args.output_dir)
    path = download_file(url, out)
    print(path)
    print(f"Saved: {path}", file=sys.stderr)


if __name__ == "__main__":
    main()
