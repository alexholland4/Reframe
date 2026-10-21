/* Bounded decoder for consecutive pretty-printed Luna JSON objects. */
module.exports = function decoder(receive, limit = 131072) {
  let buffer = "", offset = 0, depth = 0, quoted = false, escaped = false, start = -1;
  return function push(text) {
    buffer += text;
    if (buffer.length > limit) throw new Error("Oversized native reply");
    for (let i = offset; i < buffer.length; i++) {
      const c = buffer[i];
      if (!depth) {
        if (/\s/.test(c)) continue;
        if (c !== "{") throw new Error("Unexpected native output");
        start = i; depth = 1; continue;
      }
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        receive(JSON.parse(buffer.slice(start, i + 1)));
        buffer = buffer.slice(i + 1); i = -1; start = -1;
      }
    }
    offset = buffer.length;
  };
};
