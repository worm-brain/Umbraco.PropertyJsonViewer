import { manifests as entrypoints } from "./entrypoints/manifests.js";
import { manifests as rawValue } from "./raw-value/manifests.js";

/**
 * Every manifest the package registers statically. `umbraco-package.json` loads this bundle, and each
 * feature folder contributes its own `manifests` array. The property action itself is not here: the
 * entry point registers it at runtime (ADR 0002).
 */
export const manifests: Array<UmbExtensionManifest> = [...entrypoints, ...rawValue];
