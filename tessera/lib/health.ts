/** Produces a dependency-free response suitable for Cloud Run startup checks. */
export function getHealthPayload(demoOnly = process.env.DEMO_ONLY ?? "false") {
  return {
    mode: demoOnly.toLowerCase() === "true" ? "demo" : "live",
    ok: true,
    service: "tessera-web",
  } as const;
}
