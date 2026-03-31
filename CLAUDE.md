# Krea AI — Agent Skill

This repository is an agent skill for the Krea.ai API, distributed across multiple channels.

## Project Structure

- `SKILL.md` — Skill instructions (Agent Skills standard with YAML frontmatter)
- `COOKBOOK.md` — 5 real-world recipes
- `scripts/` — Python scripts (uv run, inline dependencies)
- `clawhub/` — Self-contained copy for ClawHub upload (OpenClaw-specific paths)
- `.claude-plugin/marketplace.json` — Claude Code plugin marketplace config
- `package.json` — npm metadata for skillpm distribution

## Environment

- `KREA_API_TOKEN` — Required. Get one at https://krea.ai/settings/api-tokens

## Distribution Channels

- **skills.sh** — `npx skills add krea-ai/skill`
- **Claude Code** — `/plugin marketplace add krea-ai/skill`
- **skillpm** — `npx skillpm install krea-ai-skill`
- **ClawHub** — Upload `clawhub/` folder to clawhub.ai/upload
- **agentskill.sh** — Connect GitHub, auto-sync

## Path Convention

- Root `SKILL.md` uses relative paths (`scripts/generate_image.py`) — portable across all agents
- `clawhub/SKILL.md` uses `~/.codex/skills/krea/scripts/` — OpenClaw-specific convention
