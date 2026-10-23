# Native startup and Home integration

Work started 2026-10-23. The owner explicitly authorized native startup and,
if useful, mapping Home to Reframe, provided a stock LG Home escape remains.
This supersedes the Home-button restriction in the earlier feasibility notes.
The owner also requested moving the app row lower and removing the launch
spinner where possible.

## Installed UI and recovery preparation

Reframe 0.3.8 retains the lower app row introduced in 0.3.7. On this TV,
the focused tile's top is 1,391.5 pixels on a 2,160-pixel-high canvas (64.4%).
The Madison photo and the large app tiles remain. The package has
`noSplashOnLaunch=true`, `spinnerOnLaunch=false`, `supportGIP=true` and
`appCategory=["home"]`.
The running native app manager recognizes the splash/spinner metadata names;
[homebrew documentation](https://www.webosbrew.org/pages/appinfojson) describes
their behavior. Actual owner-visible startup timing still requires observation.

**Blue in Reframe opens LG Home directly**, by its explicit app ID, independent
of the configurable Home category. Trusted inspector key input on the actual
TV opened stock Home. The separately paired SSAP recovery connection also
opened both Reframe and stock LG Home without using SSH. Root SSH remains an
independent recovery channel. LG's Input and Settings buttons are unchanged.

The UI production build and browser checks passed, including the lower-row
layout at 1080p/4K and Blue's explicit stock-Home target/held-key handling.
Native installation verified all 46 package file hashes. Twenty-nine Python
tests pass, including seven direct-startup mutation/undo boundaries.

![Lower app row](images/reframe-0.3.7.png)

## Native configuration controller

`scripts/manage-direct-startup.py` uses existing pinned root SSH and native Luna
APIs. Mutating commands default to a no-connection plan unless `--execute` is
present. A private snapshot and intent journal are stored under ignored
`backups/direct-startup/current.json`. Do not delete or overwrite that snapshot
during a live trial. It includes the original inputs, relevant preferences,
default-app map and helper manifest/status. It contains no private SSH key.

```powershell
python scripts/manage-direct-startup.py snapshot --execute
python scripts/manage-direct-startup.py input --execute
python scripts/manage-direct-startup.py retire-helper --execute
python scripts/manage-direct-startup.py home --execute
python scripts/manage-direct-startup.py status
```

The input action registers only `com.reframe.home`, disables Home auto-launch,
and launches Reframe. Its input record must then be read back. The old managed
post-Home helper is retired through its existing hash/PID-checked controller so
it cannot mask the native test. Root SSH startup is not removed.

Home mapping uses `applicationmanager/setDefaultApp(category=home)`, a native
runtime/persistent preference; no LG Home library, key filter, firmware or boot
daemon is patched. The installed TV key filter already calls the configurable
Home category. An explicit stock-Home launch bypasses that category.

## Undo

```powershell
python scripts/manage-direct-startup.py restore --execute
```

The controller restores stock Home if it mapped it, removes only its registered
Reframe input, restores the captured Home auto-launch preference, selects the
previous physical input, and reinstalls/starts the previous managed helper if
it retired that enabled helper. Unexpected foreign Home mappings are preserved
for inspection. Restoring stock Home may leave an explicit native-Home entry
where the original map used the platform's implicit default; behavior is native.
It does not restore the older UI package or change IPTV sources/Favorites.

Native startup behavior, cold boot and wake results will be recorded here as
the trial progresses; API acceptance is not proof of a zero-flash transition.

## Native Home eligibility and rollback results

The first Home mapping saved `defaultApps.home` but `launchDefaultApp` rejected
Reframe because its metadata did not declare the Home category. Stock LG Home
was restored and its native category launch verified. LG Home's own app metadata
declares `appCategory=["home"]`; the same eligibility requirement is documented
in [independent native-TV research](https://rorygallagher2024.github.io/glasshouse/development/TV-RESEARCH/#glasshouse-home-on-webos-10-g5-webos-1031).
Reframe 0.3.8 declares that category in its own package. The native Home-category
launch now opens Reframe; Blue still opens stock Home, which stays open, and
a second native Home launch returns to Reframe. No system app file was changed.
The controller now checks installed category eligibility and tests the actual
Home-category launch, restoring stock Home if that request fails.

A complete live rollback was demonstrated before the final trial: stock Home
mapping restored, only Reframe's input removed, Home auto-launch restored, the
previous HDMI input selected, and the old managed helper reinstalled/started.
Root SSH stayed available. That restored trial journal is archived privately;
a fresh snapshot protects the final trial.

## Full restart: native Reframe first, old helper absent

The final input/Home configuration survived a controlled `/sbin/reboot`:

- Boot manager reports **firstAppId=com.reframe.home**, normal hardware boot,
  `firstAppLaunched=true` and completed boot signals.
- Actual foreground is **com.reframe.home**, with `appCategory=["home"]`.
- Home auto-launch remains off, the native default Home is Reframe, and
  `lastInputApp=com.reframe.home`. The physical input remains soundbar HDMI 2.
- Root SSH returned with a fresh root callback and low uptime; the callback
  records `launcher.enabled=false`, and the old launcher's enable flag is absent.
  No app launch or recovery request was used to produce the observed foreground.
- The TV restored the same snapshot boot UUID. As recorded in ROOT-RECOVERY.md,
  UUID change alone is not a valid restart gate; use uptime and fresh callback
  evidence as well. The initial UUID-only observer was stopped and corrected.

The native configuration is therefore responsible for this restart result.
Owner checks for the visible Home/spinner transition, remote standby/wake,
physical Home/Blue controls, sound and iPhone casting have been requested.
No TV actions run during those checks. Do not claim their acceptance until the
owner answers. Full mains-disconnection boot and behavior after choosing a
different physical HDMI input remain separate cases, not established here.

All 77 Node tests and 29 Python tests pass. The original once-per-wake helper's
tests are retained for its tested rollback path; that helper is not active.
