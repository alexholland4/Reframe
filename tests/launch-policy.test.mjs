import assert from "node:assert/strict";
import test from "node:test";
import policy from "../scripts/root-probe/launch-policy.cjs";

for (const app of ["com.webos.app.home", "com.webos.app.hdmi2"]) test("boot launches once from " + app, () => {
  const p = policy(); p.power("active", 100);
  assert.deepEqual(p.foreground(app, 200), {launch:true, from:app});
  p.commit();
  assert.equal(p.foreground("com.reframe.home", 300), null);
  assert.equal(p.foreground("com.webos.app.home", 400), null);
});
test("startup transitions between Home and the soundbar can settle before launch commits", () => {
  const p = policy(); p.power("active", 100);
  assert.equal(p.foreground("com.webos.app.home", 200).launch, true);
  assert.equal(p.foreground("com.webos.app.hdmi2", 250).launch, true);
  p.commit();
  assert.equal(p.foreground("com.webos.app.home", 300), null);
});
for (const app of ["com.palm.app.settings", "youtube.leanback.v4", "airplay", "com.webos.chromecast", "com.webos.app.hdmi1", "com.webos.app.hdmi3"]) {
  test("boot yields to native app/input/casting: " + app, () => {
    const p = policy(); p.power("active", 100);
    assert.equal(p.foreground(app, 200), null);
    assert.equal(p.foreground("com.webos.app.home", 300), null);
  });
}
test("wake rearms once, while screensaver dismissal does not intercept native Home", () => {
  const p = policy(); p.foreground("com.webos.app.home", 10);
  assert.equal(p.power("active", 20).launch, true);
  p.commit();
  p.foreground("com.reframe.home", 30);
  p.power("screenSaver", 40); p.power("active", 50);
  assert.equal(p.foreground("com.webos.app.home", 60), null);
  p.power("suspend", 70);
  assert.equal(p.power("active", 80).launch, true);
});
test("unknown power and late foreground observations leave native TV in control", () => {
  const p = policy(); p.power("unknown", 1);
  assert.equal(p.foreground("com.webos.app.home", 3), null);
  const q = policy(); q.power("active", 1);
  assert.equal(q.foreground("com.webos.app.home", 21002), null);
});

test("native Active Standby wakes once even if Reframe is observed before LG restores Home", () => {
  const p = policy(); p.power("Active", 1); p.foreground("com.webos.app.home", 2); p.commit();
  p.foreground("com.reframe.home", 3); p.power("Active Standby", 4);
  assert.equal(p.power("Active", 5), null);
  assert.equal(p.foreground("com.webos.app.home", 6).launch, true);
  p.commit(); assert.equal(p.foreground("com.webos.app.home", 7), null);
});

test("a confirmed Active state can follow an unrecognized transition, while native playback still wins", () => {
  const p = policy(); p.power("transition", 1); p.power("Active", 2);
  assert.equal(p.foreground("com.webos.app.home", 3).launch, true);
  const q = policy(); q.power("transition", 1); q.foreground("youtube.leanback.v4", 2);
  assert.equal(q.power("Active", 3), null);
  assert.equal(q.foreground("com.webos.app.home", 4), null);
});
