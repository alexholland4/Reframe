/* Temporary trial safeguard: remove only our env override if no health confirmation. */
const fs = require('fs'), crypto = require('crypto'), cp = require('child_process');
const base = '/var/lib/reframe/native-cover';
const nonce = process.argv[2];
if (process.getuid() !== 0 || !/^[0-9a-f]{32}$/.test(nonce || '')) throw Error('Invalid trial');
setTimeout(() => {
  const proof = base + '/trial-ok-' + nonce;
  try {
    const stat = fs.lstatSync(proof);
    if (stat.isFile() && !stat.isSymbolicLink() && stat.uid === 0 && fs.readFileSync(proof, 'utf8') === nonce) return;
  } catch (e) { if (e.code !== 'ENOENT') return; }
  try {
    const plan = JSON.parse(fs.readFileSync('/var/lib/reframe/native-cover-plan.json', 'utf8'));
    const env = '/var/systemd/system/env/surface-manager.env';
    if (plan.purpose !== 'reframe-native-cover' || plan.environmentBefore !== null || plan.environment !== env) return;
    const stat = fs.lstatSync(env);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== 0 || (stat.mode & 18)) return;
    if (crypto.createHash('sha256').update(fs.readFileSync(env)).digest('hex') !== plan.environmentSha256) return;
    fs.unlinkSync(env);
    fs.writeFileSync(base + '/trial-rolled-back-' + nonce, 'Native cover trial unconfirmed; original import path restored\n', {flag:'wx', mode:384});
    cp.spawn('/bin/systemctl', ['restart', 'surface-manager-daemon.service'], {detached:true, stdio:'ignore'}).unref();
  } catch { /* Preserve unexpected state for the independent root SSH recovery path. */ }
}, 90000);
