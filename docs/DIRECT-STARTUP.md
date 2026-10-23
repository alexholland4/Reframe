# Direct Reframe startup: feasibility investigation

**Implementation update, 2026-10-23:** the owner subsequently authorized Home
mapping too, provided LG Home remains accessible. The native input/default-Home
integration is installed, with Blue as a direct stock-Home escape. A full restart
reports Reframe as the native first app, with the old delayed helper removed.
Read [NATIVE-STARTUP.md](NATIVE-STARTUP.md) and the latest HANDOFF.md for current
results, owner checks and scoped undo. The investigation/restrictions below are
historical and do not supersede that later authorization.

Investigated 2026-10-22 on the owner's rooted LG 55UA7050PUB, webOS 25,
firmware 33.30.97. The owner wants Reframe to be the first visible app on both
cold power-on and standby/wake. The physical Home button must continue opening
LG Home as an escape. App/cast exit routing remains a separate deferred task.

This investigation made **read-only** startup/input/settings queries. No
startup preference, EIM device, root hook, Home mapping or LG file was changed.
Only the separately requested Madison wallpaper was installed in Reframe 0.3.6.

## Why the existing helper flashes Home

The helper in `scripts/root-probe/boot-launcher.cjs` subscribes to power and
foreground events. It waits for LG Home or soundbar HDMI 2, waits another
350 ms, rechecks foreground, then launches Reframe once within a 20-second
startup/wake window. It is a fallback after native startup has selected an app.
Shortening that delay cannot establish that Home is never displayed.

Native observations:

- `bootManager/getBootStatus` reported `firstAppId=com.webos.app.home`.
- General `homeAutoLaunch=on`, `checkHomeAutoLaunchValue=default`,
  `checkForcedInputPowerOn=off`, `selectedInputApp=off`, `lifeOnScreenMode=off`.
- The EIM device database contains the three physical HDMI inputs, no Reframe.
- EIM's last input is HDMI 2, the soundbar. The separate saved last foreground
  app is IPTV. These are different records: normal app foreground does not
  automatically make an app the TV's last input.
- The current root helper is still running and its status recorded launches
  from Home. This does not explain every reported instance of staying on Home;
  those intermittent cases need event capture during a reproduced failure.

## Best first experiment: native input startup

The upstream [YouTube webOS autostart instructions](https://github.com/webosbrew/youtube-webos#autostart)
document registering an app as an input through EIM, with a matching removal
API. Its stated behavior is automatic launch when it was the last-used input
and keeping the app available in the background. This is evidence for a trial,
not proof of behavior on this TV.

This TV's `/etc/palm/action-condition.json` explicitly contains an **Input App**
boot action that launches `${Last Input App}`. The last input condition reads
`physicalLastInputApp` from `/var/luna/preferences/general`. The native path is
therefore a better candidate than racing the Home screen with a later helper.

A bounded trial should:

1. Privately snapshot general startup preferences, input entries, last-input
   records and the current helper manifest/status, preserving the known undo.
2. Register **only** `com.reframe.home` using the EIM `addDevice` API, following
   the upstream app-input payload (`appId`, empty `pigImage`, empty `mvpdIcon`).
   Read the input list back and verify its new entry. Do not hand-edit EIM JSON.
3. Disable Home auto-launch through the native general settings API, then
   select the new Reframe input and verify the actual saved input via reads.
   For the measured native-startup trial, remove the old managed helper with
   its tested launcher controller, retaining its source/manifest and reinstall
   path. Otherwise it could mask failed native routing. Its current policy
   also stays armed when Reframe appears first, so a manual Home press within
   that 20-second window could be mistaken for LG's startup Home restoration.
   That behavior is incompatible with the requested immediate Home escape.
4. Test standby/wake from Reframe, from YouTube and after casting; test a full
   cold restart separately. Also test after selecting an actual HDMI input.
   Observe/record the screen sequence: a successful API reply or a foreground
   sample cannot establish that Home never flashed between samples.
5. Confirm the physical Home button still opens LG Home and stays there, and
   Settings/Back, soundbar audio, apps and the three accepted iPhone casting
   paths still work. Do not run automation over an owner playback check.

Planned undo is EIM `deleteDevice` for **only** `com.reframe.home`, restoration
of the captured startup preferences and selection of the previous input.
Reinstall/start of the existing tested launcher helper is the fallback;
root SSH remains available independently of that launcher helper.
These mutations and power tests have **not** been run in this investigation.

### Critical limitation: last input versus always Reframe

Input autostart is conditional on the remembered input. Selecting HDMI, or
possibly soundbar CEC activity, may change it. It must not be described as an
unconditional startup replacement without those tests.

The native setting descriptor for `selectedInputApp` advertises only `off` and
`HDMI_1` through `HDMI_4`. Its disabled value validation is not evidence that
arbitrary app IDs are implemented. Do not write a Reframe app ID into it on
that assumption. A fixed Reframe target needs further native evidence if the
last-input method cannot satisfy the owner's always-Reframe requirement.

## Paths excluded from this first experiment

- **Changing the default Home app or key filter.** This TV's key filter uses
  `launchDefaultApp(category=home, launchType=homeKey)`. Changing that default
  would change the Home button, contrary to the explicit constraint. Other
  [launchers' replacement methods](https://github.com/MinerBlox/TVLauncher)
  also patch key filters or the stock Home library; do not apply them here.
- **Patching stock boot configuration, restarting bootd, or masking LG Home.**
  `/etc/palm/bootd.json` selects LG Home as the normal default. The boot daemon
  runs before the existing root hook; a late mount alone does not prove that
  its already-read configuration will change. Its systemd service has
  `StartLimitAction=reboot`, so daemon experimentation can disrupt recovery.
- **Assuming `/var/luna/preferences/bootd.json` is a first-app override.** It is
  absent here. The public LG bootd source names it a debug configuration and
  demonstrates logger settings, not this TV's arbitrary first-app override.
  The retail daemon differs from OSE; no guessed file was created.

Conclusion: a reversible, Home-preserving native input trial is plausible.
Unconditional, zero-LG-Home startup on both cold boot and wake is not yet proven.
Private raw reads and downloaded comparison sources are under ignored
`.research/direct-startup/`; they are not boot components or tracked secrets.
