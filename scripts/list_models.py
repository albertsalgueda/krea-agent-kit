# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///

"""List available Krea AI models."""

import argparse
import json

IMAGE_MODELS = {
    "z-image":           {"provider": "Z-Image",   "cu": 3,    "time": "~5s",   "capabilities": ["text-to-image"], "description": "Fastest, cheapest"},
    "flux":              {"provider": "BFL",        "cu": 5,    "time": "~5s",   "capabilities": ["text-to-image", "image-to-image", "styles/LoRAs"], "description": "Fast, LoRA support"},
    "flux-kontext":      {"provider": "BFL",        "cu": 9,    "time": "~5s",   "capabilities": ["text-to-image", "image-to-image"], "description": "Context-aware editing"},
    "qwen":              {"provider": "Qwen",       "cu": 9,    "time": "~15s",  "capabilities": ["text-to-image"], "description": "Good quality, cheap"},
    "imagen-4-fast":     {"provider": "Google",     "cu": 16,   "time": "~17s",  "capabilities": ["text-to-image"], "description": "Fast Google model"},
    "ideogram-2-turbo":  {"provider": "Ideogram",   "cu": 20,   "time": "~8s",   "capabilities": ["text-to-image"], "description": "Good typography"},
    "seedream-4":        {"provider": "ByteDance",  "cu": 24,   "time": "~20s",  "capabilities": ["text-to-image", "image-to-image"], "description": "Photorealistic"},
    "seedream-5-lite":   {"provider": "ByteDance",  "cu": 28,   "time": "~20s",  "capabilities": ["text-to-image", "image-to-image"], "description": "Latest Seedream"},
    "flux-pro":          {"provider": "BFL",        "cu": 31,   "time": "~11s",  "capabilities": ["text-to-image", "image-to-image", "styles/LoRAs"], "description": "High quality Flux"},
    "nano-banana":       {"provider": "Google",     "cu": 32,   "time": "~10s",  "capabilities": ["text-to-image", "image-to-image"], "description": "Balanced"},
    "imagen-3":          {"provider": "Google",     "cu": 32,   "time": "~32s",  "capabilities": ["text-to-image"], "description": "Google Imagen 3"},
    "imagen-4":          {"provider": "Google",     "cu": 32,   "time": "~32s",  "capabilities": ["text-to-image"], "description": "Google Imagen 4"},
    "runway-gen4":       {"provider": "Runway",     "cu": 40,   "time": "~60s",  "capabilities": ["image-to-image"], "description": "Needs reference images"},
    "flux-pro-ultra":    {"provider": "BFL",        "cu": 47,   "time": "~18s",  "capabilities": ["text-to-image", "image-to-image", "styles/LoRAs"], "description": "Best Flux quality"},
    "imagen-4-ultra":    {"provider": "Google",     "cu": 47,   "time": "~30s",  "capabilities": ["text-to-image"], "description": "Best Imagen"},
    "nano-banana-flash": {"provider": "Google",     "cu": 48,   "time": "~15s",  "capabilities": ["text-to-image", "image-to-image"], "description": "Fast photorealism"},
    "ideogram-3":        {"provider": "Ideogram",   "cu": 54,   "time": "~18s",  "capabilities": ["text-to-image", "styles"], "description": "Best text rendering"},
    "nano-banana-pro":   {"provider": "Google",     "cu": 119,  "time": "~30s",  "capabilities": ["text-to-image", "image-to-image"], "description": "Superior photorealism"},
    "seedream-3":        {"provider": "ByteDance",  "cu": None,  "time": "varies", "capabilities": ["text-to-image", "image-to-image"], "description": "ByteDance Seedream 3"},
    "gpt-image":         {"provider": "OpenAI",     "cu": 184,  "time": "~60s",  "capabilities": ["text-to-image", "image-to-image", "styles/LoRAs"], "description": "Highest quality"},
}

VIDEO_MODELS = {
    "kling-1.0":   {"provider": "Kling",   "cu": 282,  "time": "~289s", "capabilities": ["text-to-video", "image-to-video", "camera-control"], "description": "Camera control, 5-10s"},
    "kling-1.5":   {"provider": "Kling",   "cu": None, "time": "varies", "capabilities": ["text-to-video", "image-to-video", "camera-control"], "description": "Complex scenes"},
    "kling-2.5":   {"provider": "Kling",   "cu": None, "time": "varies", "capabilities": ["text-to-video", "image-to-video", "camera-control"], "description": "Realistic physics"},
    "veo-3":       {"provider": "Google",  "cu": 1017, "time": "~65-128s", "capabilities": ["text-to-video", "image-to-video", "audio"], "description": "Can generate audio"},
    "veo-3.1":     {"provider": "Google",  "cu": None, "time": "varies", "capabilities": ["text-to-video", "image-to-video"], "description": "Cinematic quality"},
    "hailuo-2.3":  {"provider": "Hailuo",  "cu": None, "time": "varies", "capabilities": ["text-to-video", "image-to-video"], "description": "Fast, smooth motion"},
    "wan-2.5":     {"provider": "Alibaba", "cu": 569,  "time": "~180s", "capabilities": ["text-to-video", "image-to-video"], "description": "Style control"},
}

ENHANCERS = {
    "topaz":            {"cu": 51,  "time": "~19s",  "max_resolution": "22K", "description": "Faithful upscaler"},
    "topaz-generative": {"cu": 137, "time": "~96s",  "max_resolution": "16K", "description": "Creative enhancement"},
    "topaz-bloom":      {"cu": 256, "time": "~132s", "max_resolution": "10K", "description": "Creative details"},
}


def main():
    parser = argparse.ArgumentParser(description="List available Krea AI models")
    parser.add_argument("--type", choices=["image", "video", "enhance", "all"], default="all", help="Filter by type")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    if args.json:
        result = {}
        if args.type in ("all", "image"):
            result["image_models"] = IMAGE_MODELS
        if args.type in ("all", "video"):
            result["video_models"] = VIDEO_MODELS
        if args.type in ("all", "enhance"):
            result["enhancers"] = ENHANCERS
        print(json.dumps(result, indent=2))
        return

    if args.type in ("all", "image"):
        print("=== Image Models ===")
        print(f"{'Model':<20} {'CU':>5} {'Time':<8} {'Description'}")
        print("-" * 70)
        for name, info in IMAGE_MODELS.items():
            cu = str(info["cu"]) if info["cu"] else "?"
            print(f"{name:<20} {cu:>5} {info['time']:<8} {info['description']}")
        print()

    if args.type in ("all", "video"):
        print("=== Video Models ===")
        print(f"{'Model':<20} {'CU':>5} {'Time':<10} {'Description'}")
        print("-" * 70)
        for name, info in VIDEO_MODELS.items():
            cu = str(info["cu"]) if info["cu"] else "?"
            print(f"{name:<20} {cu:>5} {info['time']:<10} {info['description']}")
        print()

    if args.type in ("all", "enhance"):
        print("=== Enhancers ===")
        print(f"{'Enhancer':<20} {'CU':>5} {'Time':<8} {'Max Res':<8} {'Description'}")
        print("-" * 70)
        for name, info in ENHANCERS.items():
            print(f"{name:<20} {info['cu']:>5} {info['time']:<8} {info['max_resolution']:<8} {info['description']}")
        print()


if __name__ == "__main__":
    main()
