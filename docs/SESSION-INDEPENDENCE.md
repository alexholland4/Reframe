# Root persistence independent of the LG session

Prepared 2026-10-21. Marker undo was demonstrated live; LG app removal is
approval-blocked and has NOT run. HANDOFF.md records current status.

Authenticated root startup now survives a controlled restart with Developer
Mode retained, and Reframe automatically follows the soundbar's startup screen.
The regular LG marker still contains the expiring session token. Keeping this
setup unchanged does not establish independence from LG session expiry.

The pinned [SlopBro installer](https://github.com/throwaway96/slopbro/blob/21023d56ca424607bb03d2939609cc658c655fc7/wwwroot/autoroot.sh)
uses an empty directory as the marker and requires uninstalling LG Developer
Mode before reboot. This is consistent with the actual backed-up LG init:
it requires the marker path to exist, verifies/runs the LG startup only if
that script exists, and otherwise preserves developer apps. The actual signed
LG script can remove the marker on login/version/session failure, including
with recursive deletion; a directory alone does not protect against that script.
No signed script should be patched or left invalid to defeat its verification.

## Concrete sequence and checks

`scripts/manage-devmode-transition.py` defaults to no connection for mutations
without `--execute`. `prepare --execute` checks root startup and actual HBC root,
and the successful independent SSAP recovery evidence. It captures the three
named LG app/service/package directories into a private bounded archive, checks
archive identity/hash/path scope locally, and saves it under ignored `backups/`.
It does not follow symlinks or extract that archive on the TV.

`convert --execute` uses `session-marker.cjs` to verify original marker bytes,
ownership/mode, and captured LG init/script/signature hashes. It refuses any
unexpected `dc*` session counters instead of deleting them. It creates a root
0700 transition directory, journals metadata, and saves the original credential
as root 0600 before replacing only that exact marker file with an empty 0755
directory. No session token enters tracked source, docs or console output.

Before uninstalling anything, run `restore-marker --execute` live and verify
exact original bytes/metadata, then convert again. This tests marker undo while
the original LG app/script and developer fallback remain available.

Only after boot/wake and independent recovery gates pass, `remove-app --execute`
requests the ordinary native [appInstallService remove API](https://www.webosose.org/docs/reference/ls2-api/com-webos-appinstallservice/#remove)
for `com.palmdts.devmode`, then checks actual app/startup absence and marker
preservation. OSE documentation is an API reference, not proof that this TV
completed removal; actual filesystem/service checks and later restart are
required. Root SSH, HBC elevation profiles and developer apps must still be
verified before another controlled restart.

The restart must return key-only root SSH, a fresh root-written startup record
and actual Reframe foreground with LG Developer Mode absent. Standby/wake and
owner native/casting checks are separate acceptance tests. This TV reuses its
Linux boot UUID; use reset uptime and changed daemon/helper PIDs as well.

## Undo and limits

Before native app removal, `restore-marker --execute` verifies exact saved
hashes, requires the original signed LG files still present, refuses unknown
directory contents, then restores the saved regular marker and its original
owner/mode. It never recursively deletes the marker directory.

After LG app removal, marker restoration alone is insufficient: restoring a
normal LG Developer Mode setup requires reinstalling that app and possibly
signing in/enabling a new session. Keep root SSH until that setup actually works.
The private package archive preserves files; it is not a demonstrated one-click
restoration of LG package registration/account state or a firmware rescue image.

The separate launcher-only undo remains the quick route back to native LG Home
while keeping recovery access. Complete unroot after this transition remains
unverified. No firmware/bootloader partition, read-only rootfs, default password,
telnet service, update block or casting component is changed by this stage.


## Live preparation and approval boundary

Checkpoint `1f471e5` was committed/pushed before marker changes. The complete
three-directory private archive is 6,443,932 bytes with 113 entries. Conversion
then succeeded; targeted undo restored the original regular marker. A separate
read/hash/stat verified original bytes, UID 5850/GID 5000/mode 0644, and developer
SSH still returned UID 6349. The marker was converted again for the next step.

Automatic approval review rejected the proposed native LG Developer Mode app
removal before execution, because it retires the proven developer fallback and
the owner had not explicitly approved that exact app removal. Do not bypass the
rejection. The exact original marker was restored again immediately. Current
LG app/signed startup remain present, marker is a regular file, no transition
journal remains, and no dc counters exist. No further reboot was requested.

The owner has been asked for explicit approval of just that native app removal,
including developer SSH loss, retained root SSH/SSAP recovery, and restore limits.
Until that answer arrives, the verified launcher works but root remains subject
to the retained LG session. Approved next steps are concrete: re-convert with the
tested journal/undo, native remove-app, verify actual root/profile/marker state,
then controlled restart and post-transition native/casting checks.
