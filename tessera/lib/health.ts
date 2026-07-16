/** Reports whether the current deployment can make optional live-provider calls without leaking configuration. */
export function getHealthPayload(
  demoOnly = process.env.DEMO_ONLY ?? "false",
  providerKey = process.env.GEMINI_API_KEY ?? "",
) {
  return {
    mode: demoOnly.toLowerCase() === "true" || !providerKey.trim() ? "demo" : "live",
    ok: true,
    service: "tessera-web",
  } as const;
}
