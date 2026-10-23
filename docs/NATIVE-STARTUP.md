# Native startup and Home integration

Work started 2026-10-23. The owner explicitly authorized native startup and,
if useful, mapping Home to Reframe, provided a stock LG Home escape remains.
This supersedes the Home-button restriction in the earlier feasibility notes.
The owner also requested moving the app row lower and removing the launch
spinner where possible.

## Installed UI and recovery preparation

Reframe 0.3.7 moves the app row into the lower part of the screen. On this TV,
the focused tile's top is 1,391.5 pixels on a 2,160-pixel-high canvas (64.4%).
The Madison photo and the large app tiles remain. The package has
`noSplashOnLaunch=true`, `spinnerOnLaunch=false` and `supportGIP=true`.
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
Native installation verified all 46 package file hashes. Twenty-seven Python
tests pass, including five direct-startup mutation/undo boundaries.

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
