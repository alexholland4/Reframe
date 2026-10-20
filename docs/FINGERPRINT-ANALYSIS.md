# Fingerprint Analysis — 55UA7050PUB

Source: `docs/fingerprint-20261019.txt` (read-only probe, Dev Mode shell).

**Superseded root assessment:** On 2026-10-19 the owner reopened root research.
Read [`ROOT-INVESTIGATION.md`](ROOT-INVESTIGATION.md) for current evidence and
fresh read-only kernel checks. The original Phase-3 verdict below is retained
as historical reasoning, not current guidance. The different-platform claim
and claim that signed squashfs rules out persistence were too strong. Root is
plausible but unverified on our exact unit. No root installer has been run.

## What the TV actually is

| Property | Value | Why it matters |
|---|---|---|
| Model | `55UA7050PUB.BUSSLKR` | Confirms the claimed model. |
| webOS edition | **webOS TV Lite** (`core_os "Rockhopper" 10.3.0-1906`) | A **cut-down** webOS for budget sets, not full webOS. |
| Firmware | `33.30.97` (build 2026-02-11) | Matches the figure from the brief. |
| SoC / platform | **chip `K25`**, board `K25_ATSC`, platform `ptl4tv`, `k25lp` | A **budget LCD platform**, distinct from premium OLED SoCs. |
| CPU | ARM **Cortex-A73** (impl 0x41 / part 0xd09), quad-core, aarch64 | Entry-tier ARM64. |
| Kernel | **5.4.268-294.ptl4tv.24** | Note the **`-294`** build. |
| RAM | **2 GB** (~1.75 GB total, ~100 MB free at idle) | **Hard constraint** — see below. |
| Storage | 8 GB eMMC | Tight. |
| Boot security | `webos-verity` (dm-verity), `prodkey` secured image, squashfs **read-only** rootfs, `portProtection` | Verified boot: the system partition is signed and read-only. |

## Verdict on the two things that depend on this

### 1. Phase 1 (personalized launcher, no root): fully GO — with a caveat
Nothing here blocks the no-root launcher. But the **2 GB RAM / webOS TV Lite**
profile is a real design constraint and validates the lean stack choice
(vanilla + ~7 KB JS). Implications we'll honor:
- Keep the bundle tiny; avoid heavy frameworks and large media.
- Backgrounds: prefer CSS gradients / a single optimized image over looping
  video or many high-res posters. App icons should be modest PNG/SVG, lazy where
  possible.
- Be conservative with simultaneous animations/`backdrop-filter` (GPU/mem cost
  on this class of panel).

This doesn't stop the "make it look great" goal — it just means we achieve it
with efficient assets rather than brute force.

### 2. Original root assessment (superseded; see note above)
The matching-firmware-number trap from the brief is confirmed real:
- **Different platform.** The root method referenced in the brief lists only
  premium **OLED / QNED** models. This set is a **K25 / `ptl4tv` budget LCD on
  webOS TV Lite** — a different SoC family and a different OS image. A shared
  firmware *string* (33.30.97) does **not** imply a shared exploitable platform.
- **Different kernel build.** The referenced work cites kernel builds in a
  different sub-revision than this unit's **`5.4.268-294`**.
- **Verified boot in the way.** `dm-verity` + signed `prodkey` squashfs rootfs
  means system partitions are cryptographically verified and read-only, so the
  "appear on boot / take over Home" persistence can't be done by editing system
  files regardless.

**Conclusion:** I do **not** recommend attempting any root method on this
specific unit based on current public evidence — there is no report of success
on the K25 / `ptl4tv` / webOS-Lite platform, and the risk/benefit is bad. We
revisit only if a method is independently documented as working on *this*
platform, not merely this firmware number.

## Net effect on the roadmap
- **Phases 1–2 proceed now** (launcher + widgets), as an installed Dev Mode app.
- **Phase 3 research is reopened.** See `ROOT-INVESTIGATION.md` for the service
  route, kernel candidate, and remaining compatibility/persistence questions.
  The existing app remains manually launched; debloat has not been attempted.

## Operational note (deployment)
The TV's SSH offers only legacy `ssh-rsa`. Direct SSH works with
`HostKeyAlgorithms=+ssh-rsa` + `PubkeyAcceptedAlgorithms=+ssh-rsa`. The `ares`
installer uses its own SSH stack and failed auth. Direct-SSH deployment through
`scripts/deploy.sh` subsequently installed and launched Reframe successfully,
as recorded in `HANDOFF.md`.
