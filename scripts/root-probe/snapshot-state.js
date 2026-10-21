/* Read-only, bounded original-state capture. No filesystem writes or traversal. */
function captureProtectedState(fs, spec) {
  var crypto = require("crypto");
  var total = 0;
  var entries = [];
  function capture(path, contents, virtual) {
    var record = { path: path };
    var fd;
    try {
      var item = fs.lstatSync(path);
      record.exists = true;
      record.uid = item.uid; record.gid = item.gid; record.mode = item.mode & 4095;
      record.size = item.size; record.mtimeMs = item.mtimeMs;
      if (item.isSymbolicLink()) {
        record.type = "symlink";
        record.target = fs.readlinkSync(path);
      } else if (item.isDirectory()) {
        record.type = "directory";
      } else if (item.isFile()) {
        record.type = "file";
        if (contents) {
          if (item.size > spec.maxFileBytes) throw new Error("File exceeds capture limit");
          fd = fs.openSync(path, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
          var opened = fs.fstatSync(fd);
          if (!opened.isFile() || opened.dev !== item.dev || opened.ino !== item.ino) {
            throw new Error("File identity changed before read");
          }
          if (opened.size > spec.maxFileBytes) throw new Error("Opened file exceeds capture limit");
          var limit = virtual ? spec.maxFileBytes : opened.size;
          var data = Buffer.alloc(limit + (virtual ? 1 : 0));
          var received = 0;
          while (received < data.length) {
            var count = fs.readSync(fd, data, received, data.length - received, null);
            if (!count) break;
            received += count;
          }
          var after = fs.fstatSync(fd);
          if (!virtual && (received !== opened.size || after.size !== opened.size ||
              after.mtimeMs !== opened.mtimeMs)) throw new Error("File changed during capture");
          if (received > spec.maxFileBytes || total + received > spec.maxTotalBytes) {
            throw new Error("Capture size limit exceeded");
          }
          data = data.slice(0, received);
          total += received;
          record.bytes = received;
          record.sha256 = crypto.createHash("sha256").update(data).digest("hex");
          record.base64 = data.toString("base64");
          record.contentsCaptured = true;
        }
      } else {
        record.type = "special";
        if (contents) throw new Error("Refusing nonregular file");
      }
    } catch (error) {
      if (typeof record.exists === "undefined") record.exists = false;
      record.error = error.code || String(error);
    } finally {
      if (typeof fd !== "undefined") fs.closeSync(fd);
    }
    entries.push(record);
  }
  spec.files.forEach(function (path) { capture(path, true, false); });
  spec.metadata.forEach(function (path) { capture(path, false, false); });
  spec.virtual.forEach(function (path) { capture(path, true, true); });
  var counterListing;
  try {
    var counters = fs.readdirSync(spec.counterDirectory).filter(function (name) {
      return /^dc[^/\\]*$/.test(name);
    });
    if (counters.length > spec.maxCounters) throw new Error("Too many devmode counters");
    counterListing = counters;
    counters.forEach(function (name) { capture(spec.counterDirectory + "/" + name, true, false); });
  } catch (error) { counterListing = { error: error.code || String(error) }; }
  return { schema: 1, entries: entries, counterListing: counterListing, totalBytes: total };
}
