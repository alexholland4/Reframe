# Phase 0 — Safe Setup & Hardware Fingerprinting

**Current-device update, 2026-10-20:** Setup and the initial fingerprint are
complete. The ares remote commands below are retained as the original setup
notes, but authentication failed on this TV. Use OpenSSH and
[`scripts/deploy.sh`](../scripts/deploy.sh), as documented in the
[README](../README.md) and [handoff](HANDOFF.md). The fingerprint script also
uses ares and is not the working collection path for this unit. Raw fingerprints
are private, gitignored evidence; share only sanitized findings. This document
is not a root rollback procedure. See [the root plan](ROOT-ATTEMPT-PLAN.md) and
[compatibility requirements](SYSTEM-COMPATIBILITY.md) before future changes.

**Goal:** stand up the development pipeline and answer the one question that
gates everything risky — *what SoC and kernel does the 55UA7050PUB actually
run?* — without making any irreversible change to the TV.

Everything here is reversible:
- **Developer Mode** is a toggle. Turning it off (or deleting the Dev Mode app)
  removes dev access. No system files are modified.
- The **fingerprinting** step only *reads* `/proc` and release files. Nothing is
  written to the TV.

Nothing in Phase 0 touches firmware, system partitions, or root. We do **not**
attempt rooting here, and we will not until the fingerprint confirms whether the
known method could even apply to this panel class.

---

## Step 1 — Enable Developer Mode (on the TV)

Developer Mode is **not** a Settings toggle — it's a separate app, and the
LG-account sign-in happens inside that app. You need a **free LG account** (not a
paid developer subscription); you can create it on the TV during sign-in.

1. On the TV, open the **Content Store**, search **"Developer Mode"**, and
   install the official LG *Developer Mode* app.
2. Launch it. When prompted to sign in, use an existing **LG account** or choose
   **create account** right there on the TV. (You can also pre-create one at
   [webostv.developer.lge.com](https://webostv.developer.lge.com), which
   redirects to the LG account login.)
3. In the app, toggle **Dev Mode Status → ON**. The TV reboots.
4. Reopen the app, enable **Key Server**, and note the **passphrase** shown
   (6 characters). Leave **Dev Mode** on.

> **This account is the one hard prerequisite.** Developer Mode is the only
> sanctioned way to install Reframe or get a shell, and it requires the (free)
> LG account. There is no supported path without it short of rooting.

> **Session note:** a Dev Mode session lasts ~1000 hours, then needs renewing in
> the same app. Also, Dev Mode disables itself if the TV reboots 10 times while
> offline. Neither is something Reframe can change without root. Fine for dev.

Find the TV's **IP address** under Settings → Connection (this TV is on
`192.168.40.124`).

---

## Step 2 — Install the webOS CLI (on this laptop)

```bash
npm install -g @webos-tools/cli
# verify
ares --version
```

This gives you `ares-setup-device`, `ares-package`, `ares-install`,
`ares-launch`, and `ares-shell`.

---

## Step 3 — Register the TV with the CLI

Run the interactive setup and add the TV using its IP, port **9922**, user
**`prisoner`**, and the **passphrase** from Step 1:

```bash
ares-setup-device
# choose "add", name it e.g. reframe-tv
# host: <TV IP> | port: 9922 | user: prisoner | auth: passphrase
```

Confirm connectivity:

```bash
ares-device -i --device reframe-tv
```

---

## Step 4 — Fingerprint the hardware (read-only)

Run the bundled script. It only reads system info — no writes, no installs:

```bash
bash scripts/fingerprint-tv.sh reframe-tv
```

It collects kernel version + architecture, the SoC/CPU, and the webOS build
strings, and writes them to `docs/fingerprint-<date>.txt`. Keep raw output
local and share a sanitized summary. That single file tells us:

- **Architecture + kernel** → whether the known root method's kernel/arch
  assumptions (ARM64, kernel 5.4.268-x) could even match this set.
- **SoC / board** → whether the UA budget LCD shares a platform with the OLED
  models that are actually confirmed, or is a different chip entirely.

Until we see it, root stays off the table.

---

## Step 5 — Deploy Reframe (reversible app install)

Once the device is registered, deploying the Phase 1 app is three commands:

```bash
npm run package          # builds dist/ and makes com.reframe.home_0.1.0_all.ipk
ares-install ./com.reframe.home_*.ipk --device reframe-tv
ares-launch com.reframe.home --device reframe-tv
```

To remove it completely at any time:

```bash
ares-install --remove com.reframe.home --device reframe-tv
```

This installs Reframe as an ordinary Dev Mode app. It does **not** auto-start,
does **not** take over the Home button, and leaves every stock TV function
intact. Persistence (boot launch / Home-button takeover) is a later phase and
only if Step 4 shows root is viable.

---

## What Phase 0 does NOT do

- No firmware update or downgrade.
- No root, no exploit, no system-file changes.
- No disabling of LG services or "debloat"; these are outside the current scope.

## Rollback

- Uninstall the app: `ares-install --remove com.reframe.home`.
- Turn off Developer Mode in the Dev Mode app (optionally delete the app).
- This describes ordinary unrooted Developer Mode app removal; it does not
  guarantee identical settings/state or undo root modifications.
