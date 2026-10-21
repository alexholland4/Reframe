/* One decision per boot/wake. Native Home/Back work normally afterwards. */
function policy(startupApps = ["com.webos.app.home", "com.webos.app.hdmi2"]) {
  let seenPower = false, powered = null, app = "", until = 0;
  function foreground(next, now) {
    if (typeof next !== "string" || !next) return null;
    app = next;
    if (!powered || !until || now > until) return null;
    if (startupApps.includes(app)) return {launch:true, from:app};
    until = 0; // Disarm on a native app/cast; never chase it later.
    return null;
  }
  function power(value, now) {
    if (typeof value !== "string") return null;
    const state = value.toLowerCase().replace(/[\s_-]/g, "");
    const next = ["active", "screensaver"].includes(state) ? true :
      ["off", "standby", "suspend", "suspended", "screenoff", "poweroff"].includes(state) ? false : null;
    const arm = next === true && (!seenPower || powered === false);
    seenPower = true; powered = next;
    if (arm) until = now + 20000;
    else if (next !== true) until = 0;
    return arm && app ? foreground(app, now) : null;
  }
  return {foreground, power, commit:()=>{ until = 0; }, armed:now=>Boolean(powered && until && now <= until),
    currentApp:()=>app, powered:()=>powered};
}
module.exports = policy;
