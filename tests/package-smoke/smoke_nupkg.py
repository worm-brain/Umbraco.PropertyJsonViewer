# /// script
# requires-python = ">=3.9"
# dependencies = ["umbraco-spawn-harness @ git+https://github.com/worm-brain/umbraco-spawn-harness@v0.1.0"]
# ///
"""Pre-publish smoke test of the packed Property JSON Viewer nupkg.

For each Umbraco version of one major, spawns a clean site with umbraco-spawn-harness, installs
Umbraco.Community.PropertyJsonViewer from a local folder of packed .nupkg files with zero configuration,
builds and starts it (the first start runs the unattended install), signs in as the admin and checks
that the package works as installed from NuGet:

- the site runs the exact Umbraco version asked for (no silent upgrade past the floor)
- GET  /umbraco/management/api/v1/property-json-viewer/settings answers: the package is enabled
- the backoffice lists the package manifest, and its umbraco-package.json and client bundle (with every
  chunk it imports) are served from App_Plugins (static web assets from the nupkg), stamped with the
  package version
- GET  .../property-json-viewer/stored-value is refused (403) while nobody has the read permission
- with the permission granted to the admin's group, it returns a document property's stored value

The site is removed afterwards, also on failure (unless --keep).

    dotnet pack Umbraco.Community.PropertyJsonViewer.slnx -o <pkgs> -p:UmbracoMajor=17 -p:Version=17.0.0-alpha.0
    uv run tests/package-smoke/smoke_nupkg.py --packages <pkgs> --major 17

By default the versions tried are the floor of the package's declared Umbraco range (from
Directory.Packages.props) and the newest stable release of the major; --umbraco overrides that.
Exits 1 when any version fails.
"""
import argparse
import json
import re
import shutil
import sys
import tempfile
import time
import uuid
import zipfile
from pathlib import Path
from urllib.parse import urlencode
from xml.etree import ElementTree

from umbraco_spawn_harness import (SpawnError, heading, nuget_global_packages, remove_tree, resolve_umbraco_version,
                                   say, scaffold, utf8_stdio, warn)

PACKAGE_ID = "Umbraco.Community.PropertyJsonViewer"
# The package's endpoints, below the Management API root the harness session calls.
API = "/property-json-viewer"
# Where the client build lands inside the package's static web assets (the RCL's ClientOutputDirectory).
APP_PLUGIN = "/App_Plugins/UmbracoCommunityPropertyJsonViewer"
# The document permission that allows reading raw values (PropertyJsonViewerPermissions.Read).
READ_PERMISSION = "PropertyJsonViewer.Read"
# Umbraco's built-in Textstring data type (Constants.DataTypes.Guids.TextstringGuid), the same in every version.
TEXTSTRING_DATA_TYPE = "0cc0eba1-9960-42c9-bf9b-60e150b429ae"
STORED_TEXT = "Stored by the package smoke test"
REPO_ROOT = Path(__file__).resolve().parents[2]


class SmokeFailure(Exception):
    """A check against the running site failed."""


# --------------------------------------------------------------- inputs --
def read_packages(folder):
    """Read the id and version of every .nupkg in a folder from its .nuspec.

    The file name alone is ambiguous (`Umbraco.Community.X.Core.17.0.0.nupkg`), so the nuspec inside each
    package is the source of truth.

    :param folder: the folder `dotnet pack -o` wrote to.
    :returns: a dict of package id to version.
    :raises SystemExit: when the folder holds no Property JSON Viewer package.
    """
    packages = {}
    for nupkg in sorted(Path(folder).glob("*.nupkg")):
        with zipfile.ZipFile(nupkg) as archive:
            nuspec = next(n for n in archive.namelist() if n.endswith(".nuspec") and "/" not in n)
            root = ElementTree.fromstring(archive.read(nuspec))
        # The nuspec namespace varies with the NuGet version, so match on local names.
        meta = next(el for el in root if el.tag.endswith("metadata"))
        fields = {el.tag.split("}")[-1]: el.text for el in meta}
        packages[fields["id"]] = fields["version"]
    if PACKAGE_ID not in packages:
        sys.exit(f"error: no {PACKAGE_ID} .nupkg in {folder}")
    return packages


def declared_floor(major):
    """The lowest Umbraco version the package declares for a major (UmbracoPackageRange, ADR 0001).

    :param major: 17 or 18.
    :returns: the floor version, e.g. `17.0.0`.
    :raises SystemExit: when Directory.Packages.props has no range for the major.
    """
    props = (REPO_ROOT / "Directory.Packages.props").read_text(encoding="utf-8")
    match = re.search(rf"'\$\(UmbracoMajor\)' == '{major}'\">\s*<UmbracoPackageRange>\[\s*([^,\]\s]+)", props)
    if not match:
        sys.exit(f"error: no UmbracoPackageRange for Umbraco {major} in Directory.Packages.props")
    return match.group(1)


def versions_to_try(major):
    """The declared floor of the major and its newest stable release, without duplicates.

    :param major: 17 or 18.
    :returns: the exact Umbraco versions.
    """
    latest = resolve_umbraco_version(str(major)) or sys.exit(f"error: no stable Umbraco {major} on nuget.org")
    return list(dict.fromkeys([declared_floor(major), latest]))


# ----------------------------------------------------------------- site --
def evict_from_cache(packages):
    """Delete the packages' exact versions from the NuGet global-packages folder.

    A local rebuild keeps the same version (`17.0.0-alpha.0`), and restore would otherwise reuse the
    first copy it extracted rather than the freshly packed one.

    :param packages: a dict of package id to version.
    """
    cache = nuget_global_packages()
    for package, version in packages.items():
        remove_tree(cache / package.lower() / version.lower())


def write_nuget_config(site, folder):
    """Give the site a nuget.config with the local package folder next to nuget.org.

    The harness's `add_package(source=...)` only applies to the `dotnet add package` step, not to the
    restore `build` runs, so the source has to live in configuration. Source mapping sends the Property
    JSON Viewer package to the local folder only, so nothing of the same id and version on nuget.org can
    stand in for what was just packed.

    :param site: the scaffolded harness `Site`.
    :param folder: the folder of .nupkg files.
    """
    (site.dir / "nuget.config").write_text(f"""<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
    <add key="property-json-viewer-local" value="{Path(folder).resolve()}" />
  </packageSources>
  <packageSourceMapping>
    <packageSource key="property-json-viewer-local">
      <package pattern="{PACKAGE_ID}" />
      <package pattern="{PACKAGE_ID}.*" />
    </packageSource>
    <packageSource key="nuget.org">
      <package pattern="*" />
    </packageSource>
  </packageSourceMapping>
</configuration>
""", encoding="utf-8")


# --------------------------------------------------------------- checks --
def call(session, method, path, body=None, expect=200):
    """Send an authenticated Management API request and check its status.

    :param session: the harness `ManagementApi` from `admin_session()`.
    :param method: the HTTP method.
    :param path: the path below the Management API root, e.g. `/property-json-viewer/settings`.
    :param body: an object to send as JSON.
    :param expect: the status the request must answer with.
    :returns: the parsed JSON body, or None when it is empty.
    :raises SmokeFailure: when the status differs or the body is not JSON.
    """
    status, _, text = session.request(method, path, json_body=body)
    if status != expect:
        raise SmokeFailure(f"{method} {path} returned HTTP {status}, expected {expect}: {text[:300]}")
    try:
        return json.loads(text) if text.strip() else None
    except ValueError:
        raise SmokeFailure(f"{method} {path} did not return JSON: {text[:300]}") from None


def check(condition, message):
    """Raise a SmokeFailure with the message when the condition is false."""
    if not condition:
        raise SmokeFailure(message)


def check_client(session, package_version):
    """Check the backoffice discovers the package and its static assets are served from the nupkg.

    :param session: the harness `ManagementApi`.
    :param package_version: the version of the package under test.
    :raises SmokeFailure: on the first failing check.
    """
    # The backoffice discovers umbraco-package.json from App_Plugins; its private manifest list proves it did.
    manifests = call(session, "GET", "/manifest/manifest/private")
    check(any(m.get("id") == PACKAGE_ID or m.get("name") == "Property JSON Viewer" for m in manifests),
          f"The backoffice does not list the package manifest (got {[m.get('name') for m in manifests]})")

    status, _, text = session.http.request("GET", f"{session.host}{APP_PLUGIN}/umbraco-package.json")
    check(status == 200, f"GET {APP_PLUGIN}/umbraco-package.json returned HTTP {status}")
    manifest = json.loads(text)
    check(manifest.get("version") == package_version,
          f"umbraco-package.json has version {manifest.get('version')!r}, expected {package_version!r}")

    bundle = next(e["js"] for e in manifest["extensions"] if e.get("type") == "bundle")
    status, _, text = session.http.request("GET", session.host + bundle)
    check(status == 200 and text.strip(), f"GET {bundle} returned HTTP {status}")
    # The bundle imports hashed chunks next to it; each must be in the site's static asset manifest too.
    for chunk in sorted(set(re.findall(r"\./([\w.-]+\.js)", text))):
        url = f"{bundle.rsplit('/', 1)[0]}/{chunk}"
        status, _, _ = session.http.request("GET", session.host + url)
        check(status == 200, f"GET {url} (imported by the bundle) returned HTTP {status}")
    say(f"The backoffice lists the package; {APP_PLUGIN} serves umbraco-package.json {package_version} and the bundle")


def create_document(session):
    """Create a document type with one Textstring property and a document of it, through the Management API.

    :param session: the harness `ManagementApi`.
    :returns: the document's key.
    :raises SmokeFailure: when either request fails.
    """
    document_type = str(uuid.uuid4())
    call(session, "POST", "/document-type", {
        "id": document_type, "alias": "smokePage", "name": "Smoke page", "icon": "icon-document",
        "allowedAsRoot": True, "variesByCulture": False, "variesBySegment": False, "isElement": False,
        "properties": [{
            "id": str(uuid.uuid4()), "container": None, "sortOrder": 0, "alias": "heading", "name": "Heading",
            "dataType": {"id": TEXTSTRING_DATA_TYPE}, "variesByCulture": False, "variesBySegment": False,
            "validation": {"mandatory": False}, "appearance": {"labelOnTop": False},
        }],
        "containers": [], "allowedTemplates": [], "allowedDocumentTypes": [], "compositions": [],
        "cleanup": {"preventCleanup": False},
    }, expect=201)

    document = str(uuid.uuid4())
    call(session, "POST", "/document", {
        "id": document, "parent": None, "documentType": {"id": document_type}, "template": None,
        "values": [{"alias": "heading", "value": STORED_TEXT, "culture": None, "segment": None}],
        "variants": [{"name": "Smoke page", "culture": None, "segment": None}],
    }, expect=201)
    return document


def grant_read_permission(session):
    """Give the Administrators group the package's read permission, as an administrator would under User Groups.

    :param session: the harness `ManagementApi`.
    :raises SmokeFailure: when the group cannot be found or updated.
    """
    groups = call(session, "GET", "/user-group?skip=0&take=100")["items"]
    admins = next((g for g in groups if g.get("alias") == "admin"), None)
    check(admins is not None, "No user group with the alias `admin`")
    group = call(session, "GET", f"/user-group/{admins['id']}")
    group["fallbackPermissions"] = sorted(set(group.get("fallbackPermissions", [])) | {READ_PERMISSION})
    call(session, "PUT", f"/user-group/{admins['id']}", group)


def run_checks(site, package_version):
    """Run every check against a started site.

    :param site: the running harness `Site`.
    :param package_version: the version of the Property JSON Viewer package under test.
    :raises SmokeFailure: on the first failing check.
    :raises SpawnError: when the admin cannot sign in.
    """
    session = site.admin_session()

    # The version that actually runs, so a floor test cannot silently resolve a newer Umbraco.
    running = call(session, "GET", "/server/information").get("version", "")
    check(running.split("+")[0] == site.umbraco_version,
          f"The site runs Umbraco {running}, expected {site.umbraco_version}")
    say(f"Signed in; the site runs Umbraco {running}")

    settings = call(session, "GET", f"{API}/settings")
    check(settings.get("readPermission") == READ_PERMISSION, f"GET {API}/settings: unexpected body {settings}")
    say("GET /settings answers: the package is enabled")

    check_client(session, package_version)

    document = create_document(session)
    query = f"{API}/stored-value?" + urlencode({"documentId": document, "propertyAlias": "heading"})
    # Nobody has the read permission until an administrator grants it, administrators included.
    call(session, "GET", query, expect=403)
    say("GET /stored-value is refused while nobody has the read permission")

    grant_read_permission(session)
    stored = call(session, "GET", query)
    check(stored.get("draft") == STORED_TEXT and stored.get("storageType") == "Nvarchar",
          f"GET /stored-value: unexpected body {stored}")
    say("GET /stored-value returns the stored draft once the admin's group has the read permission")


def smoke(root, umbraco, folder, packages, keep):
    """Spawn one Umbraco version, install the package, run the checks and remove the site.

    :param root: the sites folder.
    :param umbraco: the exact Umbraco version.
    :param folder: the folder of .nupkg files.
    :param packages: a dict of package id to version.
    :param keep: leave the site running instead of removing it.
    :returns: None when every check passed, else the failure message.
    """
    site = None
    try:
        site = scaffold(root, f"propertyjsonviewer-{umbraco}-{time.strftime('%H%M%S')}", umbraco)
        write_nuget_config(site, folder)
        site.add_package(PACKAGE_ID, packages[PACKAGE_ID])
        print("Building", flush=True)
        site.build()
        site.start()
        run_checks(site, packages[PACKAGE_ID])
        return None
    except (SpawnError, SmokeFailure) as e:
        if site:
            print(site.tail_log(), file=sys.stderr)
        return str(e)
    finally:
        if site and not keep:
            site.remove()


def main():
    utf8_stdio()
    p = argparse.ArgumentParser(prog="smoke_nupkg.py", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--packages", required=True, help="Folder of packed .nupkg files (dotnet pack -o)")
    p.add_argument("--major", required=True, type=int, choices=(17, 18), help="Umbraco major the packages target")
    p.add_argument("--umbraco", action="append", help="Exact Umbraco version to try (repeatable; default: floor and latest)")
    p.add_argument("--root", help="Folder for the spawned sites (default: a new temp folder)")
    p.add_argument("--keep", action="store_true", help="Leave the sites running")
    a = p.parse_args()

    packages = read_packages(a.packages)
    version = packages[PACKAGE_ID]
    if version.split(".")[0] != str(a.major):
        sys.exit(f"error: {PACKAGE_ID} {version} is not an Umbraco {a.major} build (ADR 0001)")
    for umbraco in a.umbraco or []:
        if umbraco.split(".")[0] != str(a.major):
            sys.exit(f"error: Umbraco {umbraco} is not Umbraco {a.major}")
    umbraco_versions = a.umbraco or versions_to_try(a.major)
    root = Path(a.root) if a.root else Path(tempfile.mkdtemp(prefix="propertyjsonviewer-smoke-"))
    evict_from_cache(packages)

    results = {}
    for umbraco in umbraco_versions:
        heading(f"{PACKAGE_ID} {version} on Umbraco {umbraco}")
        results[umbraco] = smoke(root, umbraco, a.packages, packages, a.keep)
        if results[umbraco]:
            warn(f"Umbraco {umbraco}: {results[umbraco]}")

    print()
    for umbraco, failure in results.items():
        print(f"  Umbraco {umbraco}: {'FAIL - ' + failure.splitlines()[0] if failure else 'pass'}")
    failed = [u for u, f in results.items() if f]
    print(f"{len(results) - len(failed)}/{len(results)} passed" + (f" (sites kept in {root})" if a.keep else ""))
    if not a.keep and not a.root:
        shutil.rmtree(root, ignore_errors=True)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
