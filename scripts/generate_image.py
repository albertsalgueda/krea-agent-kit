# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""Generate images using the Krea.ai API."""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from krea_helpers import get_api_key, api_post, poll_job, download_file, ensure_image_url, output_path

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
    if model_arg in KNOWN_MODELS:
        return KNOWN_MODELS[model_arg]
    if model_arg.startswith("/generate/image/"):
        return model_arg
    for endpoint in KNOWN_MODELS.values():
        if endpoint.endswith("/" + model_arg):
            return endpoint
    print(f"Warning: Unknown model '{model_arg}', trying as endpoint path", file=sys.stderr)
    return f"/generate/image/{model_arg}"


def main():
    parser = argparse.ArgumentParser(description="Generate images with Krea AI")
    parser.add_argument("--prompt", required=True, help="Text description")
    parser.add_argument("--filename", required=True, help="Output filename")
    parser.add_argument("--model", default="flux", help="Model ID, raw name, or full endpoint path")
    parser.add_argument("--width", type=int, help="Width in pixels")
    parser.add_argument("--height", type=int, help="Height in pixels")
    parser.add_argument("--aspect-ratio", help="Aspect ratio (1:1, 16:9, 9:16, etc.)")
    parser.add_argument("--resolution", choices=["1K", "2K", "4K"], help="Resolution (nano-banana models)")
    parser.add_argument("--seed", type=int, help="Random seed")
    parser.add_argument("--steps", type=int, help="Inference steps (flux models)")
    parser.add_argument("--guidance-scale", type=float, help="Guidance scale (flux models)")
    parser.add_argument("--image-url", help="Input image URL or local file path for image-to-image")
    parser.add_argument("--style-id", help="LoRA style ID")
    parser.add_argument("--style-strength", type=float, default=1.0, help="LoRA strength (-2 to 2)")
    parser.add_argument("--batch-size", type=int, help="Number of images (1-4)")
    parser.add_argument("--quality", choices=["low", "medium", "high", "auto"], help="Quality (gpt-image)")
    parser.add_argument("--output-dir", help="Output directory (default: cwd)")
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
        image_url = ensure_image_url(args.image_url, api_key)
        if args.model.startswith("flux"):
            body["imageUrl"] = image_url
        else:
            body["imageUrls"] = [image_url]

    # LoRA styles
    if args.style_id:
        body["styles"] = [{"id": args.style_id, "strength": args.style_strength}]

    print(f"Generating image with {args.model}...", file=sys.stderr)
    job = api_post(api_key, endpoint, body)
    job_id = job.get("job_id")
    print(f"Job created: {job_id}", file=sys.stderr)

    result = poll_job(api_key, job_id)
    urls = result.get("result", {}).get("urls", [])

    if not urls:
        print("Error: No image URLs in result", file=sys.stderr)
        sys.exit(1)

    for i, url in enumerate(urls):
        if len(urls) == 1:
            out = output_path(args.filename, args.output_dir)
        else:
            base, ext = os.path.splitext(args.filename)
            out = output_path(f"{base}-{i + 1}{ext}", args.output_dir)
        path = download_file(url, out)
        print(path)
        print(f"Saved: {path}", file=sys.stderr)


if __name__ == "__main__":
    main()
