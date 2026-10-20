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
}

export interface ReframeConfig {
  name: string;
  /** For the weather widget (Open-Meteo, no API key required for MVP). */
  location: { label: string; lat: number; lon: number };
  /** 24h clock if true. */
  clock24h: boolean;
  tiles: AppTile[];
}

export const config: ReframeConfig = {
  name: "Alex",
  location: { label: "Local", lat: 40.7128, lon: -74.006 },
  clock24h: false,
  tiles: [
    { label: "Netflix", appId: "netflix", accent: "#e50914" },
    { label: "YouTube", appId: "youtube.leanback.v4", accent: "#ff0000" },
    { label: "Prime Video", appId: "amazon", accent: "#00a8e1" },
    { label: "Disney+", appId: "com.disney.disneyplus-prod", accent: "#113ccf" },
    { label: "Spotify", appId: "com.webos.app.spotify-beehive", accent: "#1db954" },
    { label: "HDMI 1", appId: "com.webos.app.hdmi1", accent: "#6ea8fe" },
    { label: "HDMI 2", appId: "com.webos.app.hdmi2", accent: "#6ea8fe" },
    { label: "Live TV", appId: "com.webos.app.livetv", accent: "#9b87f5" },
  ],
};
