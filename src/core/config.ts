/**
 * User configuration: identity, theme, location, and the app grid.
 *
 * For the MVP this is a static module. A later phase moves it to persisted
 * storage (localStorage first, then a settings file once we have a service
 * layer) and a settings UI. Keeping the shape stable now means that migration
 * is drop-in.
 */

export interface AppTile {
  label: string;
  /** webOS app id. HDMI inputs use com.webos.app.hdmiN; see src/core/tv.ts */
  appId: string;
  accent?: string;
  icon: string;
  kind: "app" | "utility";
  detail?: string;
}

export interface ReframeConfig {
  name: string;
  /** For the weather widget (Open-Meteo, no API key required for MVP). */
  location: { label: string; lat: number; lon: number } | null;
  /** 24h clock if true. */
  clock24h: boolean;
  tiles: AppTile[];
}

export const config: ReframeConfig = {
  name: "Alex",
  location: null, // Set a real location before showing weather; no placeholder readings.
  clock24h: false,
  tiles: [
    { label: "Netflix", appId: "netflix", icon: "netflix.svg", kind: "app", accent: "#ffffff" },
    { label: "YouTube", appId: "youtube.leanback.v4", icon: "youtube.svg", kind: "app", accent: "#ffffff" },
    { label: "Prime Video", appId: "amazon", icon: "prime-video.svg", kind: "app", accent: "#0578ff" },
    { label: "Disney+", appId: "com.disney.disneyplus-prod", icon: "disney-plus.svg", kind: "app", accent: "#054553" },
    { label: "Settings", appId: "com.palm.app.settings", icon: "settings", kind: "utility", detail: "Make it yours" },
    { label: "HDMI 1", appId: "com.webos.app.hdmi1", icon: "hdmi", kind: "utility", detail: "External input" },
    { label: "HDMI 2", appId: "com.webos.app.hdmi2", icon: "soundbar", kind: "utility", detail: "Soundbar" },
    { label: "Live TV", appId: "com.webos.app.livetv", icon: "tv", kind: "utility", detail: "Channels & guide" },
  ],
};
