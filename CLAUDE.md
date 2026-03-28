# Krea Agent Kit

This repository provides an MCP server and Claude Code skill for the Krea.ai API.

## Project Structure

- `src/mcp-server.js` — MCP server (stdio transport) exposing all Krea API tools
- `src/krea-client.js` — Reusable API client class
- `.claude/skills/krea-api.md` — Claude Code skill with full API reference

## Environment

- `KREA_API_TOKEN` — Required. Get one at https://krea.ai/settings/api-tokens

## Running

```bash
npm install
KREA_API_TOKEN=xxx node src/mcp-server.js
```
