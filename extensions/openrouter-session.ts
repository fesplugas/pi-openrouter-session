/**
 * OpenRouter Session ID Extension
 *
 * Automatically includes a session_id in OpenRouter API requests so you can
 * track conversations in the OpenRouter console/dashboard.
 *
 * The session_id is derived from pi's session file name, ensuring that all
 * requests within the same pi session share the same OpenRouter session.
 *
 * Installation:
 *   - Place this file in ~/.pi/agent/extensions/
 *   - Run /reload in pi to load the extension
 *   - Or restart pi
 *
 * Usage:
 *   - Use OpenRouter as your provider (--provider openrouter or /model)
 *   - The extension automatically adds session_id to requests
 *   - View your sessions in the OpenRouter console
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let sessionId: string | null = null;

  // Generate/retrieve session ID when session starts
  pi.on("session_start", async (_event, ctx) => {
    const sessionFile = ctx.sessionManager.getSessionFile();

    if (sessionFile) {
      // Extract session identifier from file path (e.g., "abc123.jsonl" -> "abc123")
      const match = sessionFile.match(/([^/]+)\.jsonl$/);
      sessionId = match ? match[1] : null;
    }

    if (!sessionId) {
      // Generate a random session ID for ephemeral sessions (--no-session)
      sessionId = `ephemeral-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    console.log(`[openrouter-session] Using session_id: ${sessionId}`);
  });

  // Intercept provider requests to add session_id for OpenRouter
  pi.on("before_provider_request", (event, ctx) => {
    const payload = event.payload as Record<string, unknown>;

    // Check if this is an OpenRouter request
    let isOpenRouter = false;

    // Method 1: Check model string (e.g., "openrouter/anthropic/claude-3.5-sonnet")
    const model = payload.model as string | undefined;
    if (model?.includes("openrouter/")) {
      isOpenRouter = true;
    }

    // Method 2: Check current model's provider via context
    if (!isOpenRouter && ctx.model?.provider === "openrouter") {
      isOpenRouter = true;
    }

    if (isOpenRouter && sessionId) {
      console.log(`[openrouter-session] Adding session_id to OpenRouter request`);

      // Add session_id to the payload (OpenRouter-specific field)
      return {
        ...payload,
        session_id: sessionId,
      };
    }
  });

  // Notify when extension is loaded
  pi.on("session_start", async (_event, ctx) => {
    // Only notify on startup, not on every session_start
    if (ctx.sessionManager.getEntries().length === 0) {
      ctx.ui?.notify("OpenRouter session tracking enabled", "info");
    }
  });
}
