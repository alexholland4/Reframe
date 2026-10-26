import { fileURLToPath } from "node:url";
import { defineConfig, normalizePath, type Plugin } from "vite";

const localOnlyPaths = ["backups", ".research", "docs", "scripts", "tests", ".codex", ".agents"]
  .map(directory => normalizePath(fileURLToPath(new URL(`./${directory}/`, import.meta.url))) + "**");

// webOS packaged apps load over file://. Vite stamps `crossorigin` onto the
// emitted <script>/<link>, which makes file:// fetches fail as cross-origin on
// the TV's webkit. Strip it from the final HTML.
function stripCrossorigin(): Plugin {
  return {
    name: "reframe-strip-crossorigin",
    transformIndexHtml(html) {
      return html.replace(/\s+crossorigin/g, "");
    },
  };
}

// webOS loads the packaged app from the local filesystem, so every asset
// reference must be relative ("./") rather than root-absolute ("/").
export default defineConfig({
  base: "./",
  plugins: [stripCrossorigin()],
  build: {
    target: "es2019",
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    // Browser-check profiles contain extension HTML; they must not reload the app mid-test.
    watch: { ignored: ["**/.research/**", "**/backups/**", "**/docs/images/**"] },
    fs: {
      deny: [".env", ".env.*", "**/.git/**", "**/*.{crt,pem,key,p12,pfx}", ...localOnlyPaths],
    },
  },
});
