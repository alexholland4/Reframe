import { defineConfig, type Plugin } from "vite";

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
    host: true,
    port: 5173,
    // Browser-check profiles contain extension HTML; they must not reload the app mid-test.
    watch: { ignored: ["**/.research/**", "**/backups/**", "**/docs/images/**"] },
  },
});
