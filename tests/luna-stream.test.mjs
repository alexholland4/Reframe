import assert from "node:assert/strict";
import test from "node:test";
import decoder from "../scripts/root-probe/luna-stream.cjs";
test("Luna stream handles every byte boundary, nested objects, quotes and successive replies", () => {
  const messages = [{returnValue:true, appId:'a"{b}\\c'}, {signals:{"core-boot-done":true}, list:[{a:1}]}];
  const wire = messages.map(m => JSON.stringify(m, null, 2)).join("\n\n");
  for (let split = 0; split <= wire.length; split++) {
    const got = [], push = decoder(value => got.push(value));
    push(wire.slice(0, split)); push(wire.slice(split));
    assert.deepEqual(got, messages);
  }
});
test("Luna stream bounds incomplete frames and rejects invalid native output", () => {
  assert.throws(() => decoder(()=>{}, 8)('{"large":'), /Oversized/);
  assert.throws(() => decoder(()=>{})("not json"), /Unexpected/);
  assert.throws(() => decoder(()=>{})('{"invalid":}'), SyntaxError);
});
