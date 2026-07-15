import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("passes the browser Maps key only into the production build step", async () => {
  const [dockerfile, cloudBuild, dockerignore, readme] = await Promise.all([
    readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
    readFile(new URL("../cloudbuild.yaml", import.meta.url), "utf8"),
    readFile(new URL("../.dockerignore", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(dockerfile, /FROM base AS build[\s\S]*?ARG NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY/);
  assert.match(
    dockerfile,
    /RUN NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=\$NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY npm run build/,
  );
  assert.doesNotMatch(dockerfile, /ENV NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=/);
  assert.match(
    cloudBuild,
    /- --build-arg\r?\n\s+- NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=\$\{_NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY\}/,
  );
  assert.match(
    cloudBuild,
    /substitutions:\r?\n\s+_NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: ""/,
  );
  assert.match(dockerignore, /^\.env\*$/m);
  assert.match(
    readme,
    /--substitutions "_IMAGE=\$image,_NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=\$mapsKey"/,
  );
});
