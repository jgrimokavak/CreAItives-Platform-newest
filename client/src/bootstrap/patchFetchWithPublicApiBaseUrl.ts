// Purpose: If VITE_PublicApiBaseUrl is set, transparently route "/api/..." calls to that absolute origin.
// This avoids refactoring every call site and keeps Phase 1 risk near zero.
export function patchFetchWithPublicApiBaseUrl(): void {
  const base = (import.meta as any)?.env?.VITE_PublicApiBaseUrl as string | undefined;
  if (!base) return; // No-op: same-origin behavior remains
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input);
    // Only rewrite app-internal API calls that start with "/api"
    if (url.startsWith("/api/")) {
      const rewritten = `${base}${url}`;
      return originalFetch(rewritten, init);
    }
    return originalFetch(input as any, init);
  };
}