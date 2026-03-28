# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///

"""Check Krea job status."""

import argparse
import json
import os
import sys
import requests

API_BASE = "https://api.krea.ai"


def get_api_key(args_key):
    key = args_key or os.environ.get("KREA_API_TOKEN")
    if not key:
        print("Error: No API key provided. Set KREA_API_TOKEN or pass --api-key", file=sys.stderr)
        sys.exit(1)
    return key


def main():
    parser = argparse.ArgumentParser(description="Check Krea job status")
    parser.add_argument("--job-id", required=True, help="Job UUID")
    parser.add_argument("--api-key", help="Krea API token")
    args = parser.parse_args()

    api_key = get_api_key(args.api_key)
    headers = {"Authorization": f"Bearer {api_key}"}

    r = requests.get(f"{API_BASE}/jobs/{args.job_id}", headers=headers)
    if not r.ok:
        print(f"Error: API returned {r.status_code}: {r.text}", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(r.json(), indent=2))


if __name__ == "__main__":
    main()
