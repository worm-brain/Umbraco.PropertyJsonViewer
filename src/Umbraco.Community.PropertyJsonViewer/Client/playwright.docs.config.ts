import { defineConfig } from "@playwright/test";
import { repoRoot } from "./e2e/support/sites.js";
import type { E2eOptions } from "./e2e/support/test.js";

/**
 * Takes the documentation screenshots in `docs/images/` (`bun run docs:screenshots`), from the Umbraco 17
 * sample site. It reuses a site already running on its own launch port (44470, `dotnet run --project
 * samples/PropertyJsonViewer.Site17`), or builds nothing and starts one there, so build the client and the site
 * first (`bun run build`, then `dotnet build` of the site).
 *
 * Only one instance of a sample site can run at a time (they share its database), so stop an e2e site on 44474
 * first. Signing in starts a new backoffice session for the admin, which ends any other session of that user on
 * the site unless concurrent logins are allowed.
 */
const port = Number(process.env.DOCS_SITE_PORT ?? 44470);
const site = {
  name: "site17",
  major: 17,
  port,
  baseURL: `https://localhost:${port}`,
  projectDir: `${repoRoot}samples/PropertyJsonViewer.Site17`,
} as const;

export default defineConfig<E2eOptions>({
  testDir: "e2e/docs",
  testMatch: /\.docs\.ts$/,
  outputDir: "e2e/test-results",
  // One worker, one session: the shots run in order and some build on the previous one's state.
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    ignoreHTTPSErrors: true,
    // The size the screenshots are published at; scale 1.5 keeps text sharp on high-density screens.
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    locale: "en-GB",
    colorScheme: "light",
    site,
    baseURL: site.baseURL,
  },
  webServer: {
    command: `dotnet run --no-build --no-launch-profile --urls https://localhost:${port}`,
    cwd: site.projectDir,
    env: { ASPNETCORE_ENVIRONMENT: "Development" },
    url: `${site.baseURL}/umbraco`,
    ignoreHTTPSErrors: true,
    timeout: 300_000,
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "pipe",
  },
});
