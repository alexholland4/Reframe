# Root investigation — LG 55UA7050PUB

Investigated: **2026-10-19; live follow-up 2026-10-20 (America/Chicago)**.
This supersedes earlier blanket
root/persistence conclusions in the handoff and fingerprint analysis.

## Finding

**Root is plausible and worth investigating. Compatibility and persistence on
this exact unit remain unverified.** Investigate SlopBro's service-based route
first; retain Chronomaly as a kernel-based candidate. That ordering is an
engineering judgment, not a guarantee that either works.

The owner reopened research. The initial pass was public-source review and
read-only SSH inspection. The follow-up paired remote clients, read app
metadata, and temporarily launched/closed diagnostic pages in existing system
apps. No root exploit or installer was executed, no Homebrew Channel installed,
and no firmware or startup hook changed. Pairing relationships were created on
the TV. Credentials and first-use trust pins are local and gitignored; initial
device trust was not independently authenticated out of band.

## Why the earlier exclusion was too strong

- Chronomaly's reported working 86QNED70AUA has OTA identifier
  `HE_DTV_W25P_AFADATAA`, matching our measured `hardware_id`.
  [Compatibility table](https://github.com/AnalyticETH/chronomaly-webos#known-good-values)
- OpenLGTV's extraction tooling maps that identifier to Realtek `k25lp`.
  A QNED label alone does not establish a different platform.
  [Platform mapping comments](https://github.com/openlgtv/epk2extract/blob/master/keys/AES.key)
- Glasshouse documents a root shell on a 55UA73006LA with K25, `k25lp`, webOS
  TV Lite, the same identifier, and a related `5.4.268-294.24.papikonda.2`
  kernel. It is DVB, firmware 33.31.61; ours is ATSC, 33.30.97. The report does
  not establish its rooting method or compatibility with our unit.
  [UA73 hardware report](https://rorygallagher2024.github.io/glasshouse/development/tv-specs/ua73/)
- Signed squashfs prevents ordinary edits to the underlying image. Rooted webOS
  can apply runtime bind mounts/overlays and recreate them at boot. Our TV also
  has `CONFIG_OVERLAY_FS=y`.
  [Homebrew overlay documentation](https://github.com/webosbrew/pages/blob/main/content/pages/hacking/overlays.md)

## Fresh measurements on our TV

Measured through the existing prisoner SSH connection. Original fingerprint
provides device/firmware context. Serial numbers, MAC addresses, and NDUID are
omitted from this report.

| Check | Observation | Meaning |
|---|---|---|
| Kernel | `5.4.268-294.ptl4tv.24` | Exact LG build still matters |
| Kernel ABI | `ARM64=y`, `64BIT=y` | 64-bit kernel |
| Userland ABI | `getconf LONG_BIT` = 32; BusyBox ELF32/ARM | Userland bitness differs from kernel bitness |
| Compatibility | `COMPAT=y` | Kernel includes 32-bit compatibility support |
| Pages | 4096 bytes; `ARM64_4K_PAGES=y` | Matches Chronomaly's assumed page size |
| CPUs online | `0-3` | Four CPUs available |
| Identity | UID 6349, prisoner; effective capabilities zero | Ordinary sandboxed session, not root |
| Timers | `POSIX_TIMERS=y` | Relevant subsystem exists |
| Allocator | `SLUB=y`, `SLUB_CPU_PARTIAL=y` | Relevant allocator options exist |
| Allocator hardening | `SLAB_FREELIST_RANDOM`, `SLAB_FREELIST_HARDENED`, `SLUB_DEBUG` disabled | Those additional allocator differences are absent |
| Layout options | `KEYS=y`, `SYSVIPC=y` | Matches two options named by Chronomaly's author; not full layout verification |
| Helpers | `MODULES=y`; modprobe sysctl exists and reads `/sbin/modprobe`; `STATIC_USERMODEHELPER` disabled | Relevant helper support exists; escalation untested |
| Filtering | `SECCOMP` disabled; `NoNewPrivs: 0` | Does not remove filesystem/Luna restrictions |
| Inspection | No visible BTF or slab sysfs; slabinfo root-only | Object sizes and offsets not established |
| Resources | About 353 MB available RAM; hard open-file limit 524288 | Snapshot, not reliability proof |

Kernel option names in the table omit the `CONFIG_` prefix. Full kernel config
and bus-query results: `docs/fingerprint-root-config-20261019.txt` (gitignored).

System app directories were not visible in the jail. Public-bus `getAppInfo`
was explicitly denied for all five SlopBro candidate apps. **This does not mean
the apps are absent.** App inventory needs another permitted interface, such
as paired SSAP. Two initial SSH attempts stopped at host-key verification;
subsequent probes used the project-local saved key.

## Candidate 1: SlopBro / jsserver

### Live preflight results, 2026-10-20

The inventory-only client paired successfully and returned **165 apps**.
All five candidates are installed and all five loaded the project's local
diagnostic page through the launch parameter used by SlopBro:

| App suffix | URL parameter | Manifest trust | Native bridge | SDK/foreground reads |
|---|---|---|---|---|
| `adoverlayex` | `interactiveUrl` | trusted | PalmServiceBridge | succeeded |
| `adoverlay` | `interactiveUrl` | trusted | PalmServiceBridge | succeeded |
| `acroverlay` | `contentTarget` | default | PalmServiceBridge | succeeded |
| `tinybrowser` | `contentTarget` | default | PalmServiceBridge | succeeded |
| `dangbei-overlay` | `target` | default; privilegedJail; requiredPermissions all | PalmServiceBridge | succeeded |

`webOSServiceBridge` was undefined in these contexts. The SDK read returned
10.3.0. This establishes page delivery and useful native bus access on the
actual ATSC unit. **It does not establish UID 0 or jsserver exploit success.**

`com.webos.service.bus/isCallAllowed` returned `allowed:false` for each app ID
and the jsserver run URI. A control query in adoverlayex also returned false
for `getForegroundAppInfo`, although the same page had just called that method
successfully. Do not use that named-requester lookup alone as a verdict on
the native bridge context. The bus metadata lists jsserver `/run` under the
`system` group; it does not prove that a usable vulnerability is present.
[Bus introspection reference](https://www.webosose.org/docs/reference/ls2-api/com-webos-service-bus/)

No diagnostic invoked jsserver/run. Its URI was only data in a read-only
permission query. There were no root payload downloads, kernel exploit
attempts, or privileged installer calls.

### Diagnostic lifecycle findings

- The first page lacked self-close. SSH `close` was denied; a re-launch did
  not reload that existing instance. Paired SSAP cleanup requests were also
  denied (401 with CLOSE alone; 403 with lifecycle permissions).
- A second trusted diagnostic successfully used `closeByAppId` to close the
  original adoverlayex instance. Generic `close` expects a different identifier
  on this build and returned `no app matched by pid`.
- Updated pages request self-closure after sending results. A subsequent
  trusted check confirmed the earlier adoverlayex and Dangbei instances were
  no longer running. Visible-process checks were also recorded, but are not
  treated as authoritative proof of host-wide process absence.
- All local diagnostic servers were stopped. Reframe was restored with a
  successful launch response. No TV reboot or Developer Mode removal occurred.

Saved local evidence: `docs/fingerprint-ssap-apps.txt`, the pairing fingerprint
files, and timestamped `docs/fingerprint-entry-*.txt` logs (all gitignored).
The early unsuffixed adoverlayex log contains the second, no-page re-launch
attempt; the later timestamped log contains the successful calibrated run.

Reusable tools: `scripts/inspect-tv-ssap.py` (inventory only),
`scripts/probe-tv-entry.py`, and `scripts/tv-diagnostics/probe.html`.
The diagnostic page is separate from Reframe's installed UI. It contains only
read queries and diagnostic-app cleanup, with no jsserver execution or download
request.

Inventory also confirms the configured Netflix, YouTube, Prime Video, Disney+,
HDMI 1/2, and Live TV IDs are installed. The configured Spotify ID was not
listed. Actual tile launching in Reframe remains untested.

### Source review pin

The upstream main ref was read with Git and a pristine local research checkout
was obtained at **`21023d56ca424607bb03d2939609cc658c655fc7`**:
`.research/slopbro-21023d5/` (gitignored). Nothing in it was executed or deployed.
The local checkout, rather than browser-rendered line numbering, is the source
for the next-stage review. File digests and proposed execution boundaries are
in [`ROOT-ATTEMPT-PLAN.md`](ROOT-ATTEMPT-PLAN.md).

### Public evidence and remaining limitation

SlopBro uses a privileged WAM app to reach a vulnerable service. Its author
reports use across webOS 4–11. It has no declared DVB-only limitation like
DangBro's legacy-broadcast route. Exact ATSC app compatibility remains unknown.
[Overview](https://github.com/throwaway96/slopbro#overview)

Its launcher includes `adoverlayex`, `adoverlay`, `acroverlay`, `tinybrowser`,
and `dangbei-overlay` candidates for internal major version 10. An installed
app may still reject the supplied page or lack required Luna permissions.
[Candidate selection source](https://github.com/throwaway96/slopbro/blob/main/slopbro.py)

First-person reports give both supporting and limiting evidence:

- A 43NU800BPSC owner reports SlopBro root and persistence; large-app install
  problems were subsequently attributed to limited storage.
  [Issue 12](https://github.com/throwaway96/slopbro/issues/12)
- A 55UA8550PSA owner reports `k25lp`, webOS 10.3.1, firmware 33.31.61. The
  completion dialog appeared, but after Developer Mode removal/reboot, HBC was
  missing and root access unverified. This is **not confirmed persistent root**.
  [Issue 22](https://github.com/throwaway96/slopbro/issues/22)
- A US G1 report describes installed overlay apps accepting launch requests
  without loading the supplied page. Older generation, but a useful example
  of why actual page loading and regional behavior must be checked.
  [Issue 7](https://github.com/throwaway96/slopbro/issues/7)

The inspected installer changes the Developer Mode marker, restarts the app
installer, installs/elevates HBC, checks startup-script signatures, and may
rename an invalid script. Where applicable it asks for Developer Mode removal
before reboot. It is **not a read-only compatibility test**; the inspected
version calls `perform_root` without a dry-run option. It was not run here.
[Installer source](https://github.com/throwaway96/slopbro/blob/main/wwwroot/autoroot.sh)

## Candidate 2: Chronomaly / CVE-2025-38352

The shared OTA identifier is stronger evidence than firmware string alone,
but does not prove the reported QNED result uses our kernel/configuration. The
project broadly documents `-320`/`-329` kernels, while ours is `-294`. Another
owner reports root on a budget UQ7070.
[README](https://github.com/AnalyticETH/chronomaly-webos),
[UQ7070 report](https://github.com/AnalyticETH/chronomaly-webos/issues/3)

The code assumes specific object layouts and allocator behavior. We measured
several matching prerequisites, but have not verified the credential offset
or object/slab sizes for our build. Its payload also makes persistent changes.
These gaps warrant investigation; they do not prove incompatibility.
[Code reviewed](https://github.com/AnalyticETH/chronomaly-webos/blob/main/getroot.c)

The Linux CNA record places the upstream 5.4 fix at **5.4.295**. Our base
5.4.268 is older, but LG could backport the fix without changing that string.
The LG `-294` suffix is **not** upstream `5.4.294`. Exact matching LG source or
running-binary patch evidence has not been obtained.
[Linux vulnerability record](https://github.com/CVEProject/cvelistV5/blob/main/cves/2025/38xxx/CVE-2025-38352.json)

The ARM64 target is statically linked, so 32-bit installed userland alone is
not a dynamic-linker blocker. No native test binary was run on this TV.
[Build definition](https://github.com/AnalyticETH/chronomaly-webos/blob/main/Makefile)

Failure reports include a reported kernel panic on a NANO model. Matching a
model or winning the initial race does not establish safe compatibility.
[Issue 4](https://github.com/AnalyticETH/chronomaly-webos/issues/4)

## Other methods

| Method | Assessment |
|---|---|
| DangBro | Author limits its legacy-broadcast chain to DVB regions; ours is ATSC. Not the first route. [Source](https://github.com/azoffshowy/dangbro) |
| jsbro-autoroot | Uses jsserver through dangbei-overlay; no equivalent declared DVB restriction. SlopBro provides additional entry candidates. [Source](https://github.com/raws0kil/jsbro-autoroot) |
| faultmanager | Author says 2025-model updates at webOS 10.1+ are patched. Our 10.3.0 is outside the stated vulnerable range. [Patch status](https://github.com/throwaway96/faultmanager-autoroot#patch-status) |
| DejaVuln / older RootMyTV | No supporting evidence for this firmware; not preferred over the newer service route. [DejaVuln](https://github.com/throwaway96/dejavuln-autoroot) |

## Persistence and Reframe

Root now, root after reboot, and Home/boot integration are separate results.
HBC 0.7.3 source includes a persistent Activity Manager boot registration and
an autostart handler. Its startup script runs init.d hooks. An absent init.d
directory in a fresh prisoner jail does not rule out that rooted mechanism.
Installation, service elevation, activity registration, and reboot behavior
still need verification on our unit.
[HBC service](https://github.com/webosbrew/webos-homebrew-channel/blob/v0.7.3/services/service.ts),
[Startup script](https://github.com/webosbrew/webos-homebrew-channel/blob/v0.7.3/services/startup.sh)

Launch Home is a relevant reference: it watches for stock Home and reopens its
own app; boot launch uses HBC hooks. That is not necessarily a hardware Home-key
remap. Cold boot and Quick Start+/standby wake need separate tests.
[Launch Home](https://github.com/gprot42/webos-launch-home)

## Next step

The inventory, page-delivery, bridge, and source-pinning work is complete.
The owner is conditionally willing to proceed at reasonable risk, with normal
TV functionality preserved. First finish the source checkpoint, native/casting
baseline, and staged backup/rollback preparation in
[`ROOT-ATTEMPT-PLAN.md`](ROOT-ATTEMPT-PLAN.md). That attempt was not performed
during this research. If the service route
fails, matching LG source/configuration is still needed for Chronomaly's
patch/layout comparison; do not automatically switch to the kernel exploit.

There is currently no basis for either "root is impossible" or "root is
confirmed on our TV."
