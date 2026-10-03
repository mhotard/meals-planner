import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    browserName: "chromium",
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
    // Traces and saved sessions include authentication inputs/cookies.
    trace: "off",
    video: "off",
  },
});
