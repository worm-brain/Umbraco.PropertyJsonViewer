import { fileURLToPath } from "node:url";

/** One sample site the e2e suite runs against. */
export interface E2eSite {
  /** Playwright project name. */
  name: "site17" | "site18";
  /** Umbraco major the site is built for (`-p:UmbracoMajor`, ADR 0001). */
  major: 17 | 18;
  /** HTTPS port; the backoffice login refuses plain HTTP (OpenIddict ID2083). */
  port: number;
  baseURL: string;
  /** The site's project folder; `dotnet run` uses it as the content root. */
  projectDir: string;
}

const repoRoot = fileURLToPath(new URL("../../../../../", import.meta.url));

/**
 * Default e2e ports, clear of the sample sites' own launch ports (44470, 44480), so a site left
 * running for manual work is never reused by accident. `E2E_SITE17_PORT` / `E2E_SITE18_PORT`
 * override one.
 */
const DEFAULT_PORTS = { 17: 44474, 18: 44484 } as const;

function port(major: 17 | 18): number {
  const value = process.env[`E2E_SITE${major}_PORT`];
  return value ? Number(value) : DEFAULT_PORTS[major];
}

function site(major: 17 | 18): E2eSite {
  const sitePort = port(major);
  return {
    name: `site${major}`,
    major,
    port: sitePort,
    baseURL: `https://localhost:${sitePort}`,
    projectDir: `${repoRoot}samples/PropertyJsonViewer.Site${major}`,
  };
}

/**
 * The sites this run covers. `E2E_SITES` is a comma list of majors (`17`, `18` or `17,18`, the
 * default); CI runs one major per matrix job.
 */
export const sites: ReadonlyArray<E2eSite> = (process.env.E2E_SITES ?? "17,18")
  .split(",")
  .map((value) => Number(value.trim()))
  .filter((major): major is 17 | 18 => major === 17 || major === 18)
  .map(site);

/** The repository root, with a trailing separator. */
export { repoRoot };
