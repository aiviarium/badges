import { defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "aiviarium-badges",
    compatibilityDate: "2026-06-01",
    entrypoint: "./src/index.js",
    observability: { enabled: true },
  }),
});
