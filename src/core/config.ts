/** Owner-selected Home apps, followed by the native LG App Store. */
export type Shelf = "home";
export interface AppTile {
  label: string;
  appId: string;
  icon: string;
  kind: "app" | "utility";
  section: Shelf;
  iconStyle?: "wordmark" | "native";
  accent?: string;
  focusColor?: string;
  detail?: string;
}
export interface ReframeConfig {
  name: string;
  location: {label:string; lat:number; lon:number} | null;
  clock24h: boolean;
  tiles: AppTile[];
}
export const config: ReframeConfig = {
  name: "Alex",
  location: null,
  clock24h: false,
  tiles: [
  {
    "label": "Netflix",
    "appId": "netflix",
    "icon": "netflix.svg",
    "kind": "app",
    "section": "home",
    "iconStyle": "wordmark",
    "accent": "#111114",
    "focusColor": "#f44b62",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Prime Video",
    "appId": "amazon",
    "icon": "prime-video.svg",
    "kind": "app",
    "section": "home",
    "iconStyle": "wordmark",
    "accent": "#0578ff",
    "focusColor": "#76b8ff",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "HBO Max",
    "appId": "com.wbd.stream",
    "icon": "installed/com.wbd.stream.png",
    "kind": "app",
    "section": "home",
    "iconStyle": "native",
    "accent": "#00030c",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Peacock",
    "appId": "com.peacock.tv",
    "icon": "installed/com.peacock.tv.png",
    "kind": "app",
    "section": "home",
    "iconStyle": "native",
    "accent": "#000000",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Paramount+",
    "appId": "com.cbs-all-access.webapp.prod",
    "icon": "installed/com.cbs-all-access.webapp.prod.png",
    "kind": "app",
    "section": "home",
    "iconStyle": "native",
    "accent": "#0064ff",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Hulu",
    "appId": "hulu",
    "icon": "installed/hulu.png",
    "kind": "app",
    "section": "home",
    "iconStyle": "native",
    "accent": "#000000",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Apple TV",
    "appId": "com.apple.appletv",
    "icon": "installed/com.apple.appletv.png",
    "kind": "app",
    "section": "home",
    "iconStyle": "native",
    "accent": "#000000",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Disney+",
    "appId": "com.disney.disneyplus-prod",
    "icon": "disney-plus.svg",
    "kind": "app",
    "section": "home",
    "iconStyle": "wordmark",
    "accent": "#054553",
    "focusColor": "#6fe2dc",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Apple Music",
    "appId": "com.apple.applemusic",
    "icon": "installed/com.apple.applemusic.png",
    "kind": "app",
    "section": "home",
    "iconStyle": "native",
    "accent": "#fa233b",
    "focusColor": "#8dafd0",
    "detail": "Music, made for your TV"
  },
  {
    "label": "More Apps",
    "appId": "com.webos.app.discovery",
    "icon": "more-apps.svg",
    "kind": "app",
    "section": "home",
    "iconStyle": "wordmark",
    "accent": "#23354b",
    "focusColor": "#a9c4e5",
    "detail": "Open the LG App Store"
  }
],
};
