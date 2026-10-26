# Direct startup and background-work cleanup

October 25, 2026. The owner retired the monogram and requested the fastest
practical startup, with careful investigation of unnecessary software.

## Installed

The native startup resource now uses the **direct** presentation. Reframe's
cover shows no logo, Loading text, spinner, drawing, minimum hold or fade.
It closes immediately when LG's existing readiness path permits. Other apps'
native covers and the stolen-device/error paths retain their original behavior.
No launch/readiness gate is bypassed. There can still be a black interval while
the TV and web engine initialize; this does not make a full restart instant.

Reframe itself remains **0.3.13**, with its Madison layout and offline/Quick
Start metadata unchanged. No app reinstall was needed. The resource image is
32,768 bytes. Only MainView.qml and its containing private image changed; all
other resource files, including the firmware-only hosts bytes, are identical.
The unused PersonalMark component remains in the private resource for inventory
compatibility, but nothing loads or renders it in direct mode.

Additional reversible changes:

- LG Home's automatic preload is disabled. The app remains installed and can
  open on demand through Blue. Its separate journal is
  `backups/preloads/home.json`; the original three exclusions have their
  unchanged `backups/preloads/current.json` journal.
- `general.screenSaverAd`, `option.livePlus` and `option.livePromotion` changed
  from on to off through LG's settings API. Home Promotion and content
  recommendations were already off and remain off. The screen-protection
  screensaver itself remains enabled. Journal:
  `backups/distractions/current.json`.
- No apps were uninstalled and no system services masked, stopped or deleted.
  Native Netflix, Prime and YouTube preloads remain available. Root, Settings,
  audio/HDMI, AirPlay, Cast, app updates and the four-host firmware block remain.

## Investigation and evidence

The read-only audit covered 173 user processes, native service definitions,
all installed app metadata, the 19-entry preload policy and the TV's own
settings descriptions. Raw device evidence remains ignored under
`.research/startup-performance/`.

| Candidate | Actual finding / decision |
| --- | --- |
| Stock LG Home | Background preload; about 36,700 KiB proportional RAM in the baseline. Disabled automatic preload while preserving the Blue escape. Absent after reboot before the explicit escape test. |
| Live Plus recognition | Baseline `acr2` used about 8,366 KiB proportional RAM. Native Live Plus/promotion switches were on. Disabled those features; `acr2` was absent after reboot. |
| Screen saver ads | Enabled. Disabled the advertising preference, retaining screen protection. |
| `ss.gateway` | Second-screen/remote gateway, about 17,447 KiB in the baseline. Preserved for remote/casting/recovery functionality. |
| Voice and AI inference daemons | About 1,223 and 433 KiB proportional RAM respectively in this sample. Shared service dependencies; no evidence they dominate startup. Preserved. |
| Native tuner/input process | Shared input functionality; preserved, including the HDMI 2 soundbar path. |
| ShopTime, LG Travel, LG Movies, Gaming Portal, Copilot, Streaming Week, bundled games | Installed but absent from the running-app/process sample and preload targets. Removing these has no demonstrated startup/RAM benefit. Storage is not constrained, so left installed. |

Baseline MemAvailable was 478,744 KiB, with writable filesystems about 35% and
44% used. After the first restart, MemAvailable was 591,700 KiB and `acr2` /
preloaded Home were absent. These different uptime/workloads and swap states
**do not establish a measured 112 MB saving**. Proportional process sizes also
change with shared pages and swapping; do not sum them into a guaranteed saving.
The full read-only firmware filesystem reporting 100% is expected, not evidence
of user storage exhaustion.

LG documents the optional Home promotion/recommendation controls in its
[support guide](https://www.lg.com/uk/support/product-support/troubleshoot/help-library/cs-CT00008333-20153529296869/)
and Live Plus in its
[webOS 25 user guide](https://kr.eguide.lgappstv.com/manual/w25/w25_tw14/engb.html).
The category/key/value types used here were checked against this TV's native
descriptions and read back after changes. No blanket LG-domain block was added.

## Validation and practical limits

The staged presentation was activated and restored in a private TV mount
namespace using a copied resource database and isolated Reframe directory.
Both directions retained exactly three owned readonly mounts; parent cover,
hosts, plan and mount namespace stayed unchanged.

The first live trial returned root and Reframe after reboot, but the compositor
screenshot endpoint gave an incomplete reply. The unconfirmed 90-second boot
guard restored the exact prior presentation and restarted only the UI. LG's
standard one-shot capture subsequently verified Madison. The owner confirmed
Reframe, Settings and Back still worked after this first restart.

A fresh second trial used the working standard capture endpoint. After the full
restart, pinned root returned at uptime 45.53 seconds, a fresh root callback was
present, the exact direct resource plan/mounts verified, and a real display
capture showed Madison/Reframe. No manual app launch or recovery produced that
startup foreground. This trial was accepted and only its own Activity cancelled.
`direct-verified-boot.json` / `.png` hold private evidence.

The full restart's cover opened at uptime 17.80 seconds; Reframe foreground was
reported at 36.61 seconds. The earlier accepted optimization restart reported
visibility at about 35.76 seconds. These samples show **no demonstrated cold-boot
speed improvement**. Removing the drawing/hold/fade removes deliberate display
work, but the native boot/readiness and web-engine startup still dominate a full
restart. Ordinary standby/wake is a different path; final owner off/on acceptance
passed as below. Do not describe an after-boot screenshot as a
recording of the entire power-on sequence.

Local checks: 96 Node and 50 Python tests pass, including partial-swap rollback,
foreign-byte refusal, accepted-guard no-op, independent Home preload journal,
preference scope/exact undo, and no TV mutations without `--execute`.
On-TV trusted inspector Blue opened stock Home on demand; native Home category
returned Reframe. Settings was confirmed as an overlay in the native window
list and in a real display capture. Prime launched to the actual foreground,
then native Home returned Reframe. The test-opened background Home was closed
with its matched native processId. A first automated Settings assertion was
corrected: an overlay does not replace Reframe's foreground app ID.

A single later fresh relaunch measured browser load complete at 2.36 s and
FCP at 1.98 s, versus 3.27 s / 2.93 s in the pre-cleanup sample. Different
uptime, caching, swapping and workloads limit causal conclusions.

**Final owner acceptance passed:** remote off / wait about 10 s / on went from
black directly to Madison/Reframe without AH, Loading text or a spinner. The
owner reported a reasonable few seconds from when the TV visibly turned on.
Settings/Back, Prime playback/exit, iPhone Screen Mirroring, AirPlay and YouTube
Cast all still work. No automated launch, recovery, restart or power request
was made during those checks.

The passive wake log records cover open at 688.6389 s and Reframe foreground at
691.0387 s, a 2.40-second interval. This does not establish remote-to-picture
latency or an improvement over the earlier accepted 2.32-second wake sample.
Evidence: `direct-owner-wake.json`. No acceptance checks remain pending.
The owner would welcome further speed improvement or a short reveal fade.
Those are optional follow-ups; no new fade or additional timing gate is installed.

## Controllers and undo

```powershell
# Return to the immediately preceding monogram presentation, preserving hosts.
python scripts/manage-cover-presentation.py restore --execute

# Restore just LG Home's captured automatic preload policy.
python scripts/manage-preloads.py restore --profile home --execute

# Restore only the captured optional promotional/Live Plus preferences.
python scripts/manage-distractions.py restore --execute
```

The presentation revision journal is
`backups/early-cover/direct-revision.json`; its root-owned counterpart and exact
before/after bytes are under `/var/lib/reframe/early-cover/revisions/<nonce>`.
The first safely rolled-back attempt has a separate archived local journal.
Preserve these and the original early-cover/native/startup/root backups.
`manage-early-cover.py disable --execute` remains the broader undo, removing the
entire owned cover/hosts resource; prefer presentation-only undo for this change.

The guard runs in the current session and through its own persistent core-boot
Activity. It restores only known before/after bytes and refuses foreign changes.
It cannot recover a failure before core boot/root access. After acceptance the
timer exits without changes; no polling/foreground-forcing helper is installed.
