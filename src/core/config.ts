/** Installed app candidates. Home/More Apps choices will follow owner review. */
export type Shelf = "watch" | "play" | "explore" | "tv";
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
    "section": "watch",
    "iconStyle": "wordmark",
    "accent": "#111114",
    "focusColor": "#f44b62",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "YouTube",
    "appId": "youtube.leanback.v4",
    "icon": "youtube.svg",
    "kind": "app",
    "section": "watch",
    "iconStyle": "wordmark",
    "accent": "#ffffff",
    "focusColor": "#ff5064",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Prime Video",
    "appId": "amazon",
    "icon": "prime-video.svg",
    "kind": "app",
    "section": "watch",
    "iconStyle": "wordmark",
    "accent": "#0578ff",
    "focusColor": "#76b8ff",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Disney+",
    "appId": "com.disney.disneyplus-prod",
    "icon": "disney-plus.svg",
    "kind": "app",
    "section": "watch",
    "iconStyle": "wordmark",
    "accent": "#054553",
    "focusColor": "#6fe2dc",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Apple TV",
    "appId": "com.apple.appletv",
    "icon": "installed/com.apple.appletv.png",
    "kind": "app",
    "section": "watch",
    "iconStyle": "native",
    "accent": "#000000",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "HBO Max",
    "appId": "com.wbd.stream",
    "icon": "installed/com.wbd.stream.png",
    "kind": "app",
    "section": "watch",
    "iconStyle": "native",
    "accent": "#00030c",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Hulu",
    "appId": "hulu",
    "icon": "installed/hulu.png",
    "kind": "app",
    "section": "watch",
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
    "section": "watch",
    "iconStyle": "native",
    "accent": "#0064ff",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Peacock",
    "appId": "com.peacock.tv",
    "icon": "installed/com.peacock.tv.png",
    "kind": "app",
    "section": "watch",
    "iconStyle": "native",
    "accent": "#000000",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Tubi",
    "appId": "com.tubitv.ott.tubi",
    "icon": "installed/com.tubitv.ott.tubi.png",
    "kind": "app",
    "section": "watch",
    "iconStyle": "native",
    "accent": "#45009d",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Pluto TV",
    "appId": "com.plutotv.app",
    "icon": "installed/com.plutotv.app.png",
    "kind": "app",
    "section": "watch",
    "iconStyle": "native",
    "accent": "#fff200",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Sling TV",
    "appId": "com.movenetworks.app.sling-tv-sling-production",
    "icon": "installed/com.movenetworks.app.sling-tv-sling-production.png",
    "kind": "app",
    "section": "watch",
    "iconStyle": "native",
    "accent": "#181818",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "LG Channels",
    "appId": "com.webos.app.lgchannels",
    "icon": "installed/com.webos.app.lgchannels.png",
    "kind": "app",
    "section": "watch",
    "iconStyle": "native",
    "accent": "#1a2c46",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Movies & TV",
    "appId": "com.lgtvod.us.app",
    "icon": "installed/com.lgtvod.us.app.png",
    "kind": "app",
    "section": "watch",
    "iconStyle": "native",
    "accent": "#ffffff",
    "focusColor": "#8dafd0",
    "detail": "Movies, series & live streaming"
  },
  {
    "label": "Apple Music",
    "appId": "com.apple.applemusic",
    "icon": "installed/com.apple.applemusic.png",
    "kind": "app",
    "section": "play",
    "iconStyle": "native",
    "accent": "#fa233b",
    "focusColor": "#8dafd0",
    "detail": "Music, games & a little downtime"
  },
  {
    "label": "Radio+",
    "appId": "com.twin.app.audiochannel",
    "icon": "installed/com.twin.app.audiochannel.png",
    "kind": "app",
    "section": "play",
    "iconStyle": "native",
    "accent": "#ffffff",
    "focusColor": "#8dafd0",
    "detail": "Music, games & a little downtime"
  },
  {
    "label": "Gaming Portal",
    "appId": "com.twin.app.gamingportal",
    "icon": "installed/com.twin.app.gamingportal.png",
    "kind": "app",
    "section": "play",
    "iconStyle": "native",
    "accent": "#ffffff",
    "focusColor": "#8dafd0",
    "detail": "Music, games & a little downtime"
  },
  {
    "label": "8 Ball Pool",
    "appId": "com.miniclip.eightballpool",
    "icon": "installed/com.miniclip.eightballpool.png",
    "kind": "app",
    "section": "play",
    "iconStyle": "native",
    "accent": "#2142ae",
    "focusColor": "#8dafd0",
    "detail": "Music, games & a little downtime"
  },
  {
    "label": "Weekend Games",
    "appId": "com.volley.lgshell",
    "icon": "installed/com.volley.lgshell.png",
    "kind": "app",
    "section": "play",
    "iconStyle": "native",
    "accent": "#ffda0a",
    "focusColor": "#8dafd0",
    "detail": "Music, games & a little downtime"
  },
  {
    "label": "App Store",
    "appId": "com.webos.app.discovery",
    "icon": "installed/com.webos.app.discovery.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#1a2c46",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Gallery+",
    "appId": "com.webos.app.lifeonscreen",
    "icon": "installed/com.webos.app.lifeonscreen.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#1a2c46",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Home Hub",
    "appId": "com.webos.app.homeconnect",
    "icon": "installed/com.webos.app.homeconnect.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#1a2c46",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Media Player",
    "appId": "com.webos.app.mediadiscovery",
    "icon": "installed/com.webos.app.mediadiscovery.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#1a2c46",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Web Browser",
    "appId": "com.webos.app.browser",
    "icon": "installed/com.webos.app.browser.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#5c75b8",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Sports",
    "appId": "com.webos.app.sportsteamsettings",
    "icon": "installed/com.webos.app.sportsteamsettings.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#1a2c46",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "LG Sports Playbook",
    "appId": "epoxyaisports",
    "icon": "installed/epoxyaisports.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#ffffff",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Amazon Alexa",
    "appId": "amazon.alexa.view",
    "icon": "installed/amazon.alexa.view.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#ffffff",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Copilot",
    "appId": "shortcutcopilot",
    "icon": "installed/shortcutcopilot.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#ffffff",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Camera",
    "appId": "com.webos.app.camera",
    "icon": "installed/com.webos.app.camera.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#1a2c46",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Travel+",
    "appId": "com.lgtravel.app",
    "icon": "installed/com.lgtravel.app.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#ffffff",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "ShopTime",
    "appId": "com.lgshop.app",
    "icon": "installed/com.lgshop.app.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#ffffff",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Homebrew Channel",
    "appId": "org.webosbrew.hbchannel",
    "icon": "installed/org.webosbrew.hbchannel.png",
    "kind": "app",
    "section": "explore",
    "iconStyle": "native",
    "accent": "#cf0652",
    "focusColor": "#8dafd0",
    "detail": "More from your TV"
  },
  {
    "label": "Settings",
    "appId": "com.palm.app.settings",
    "icon": "settings",
    "kind": "utility",
    "section": "tv",
    "detail": "Picture, sound & preferences"
  },
  {
    "label": "HDMI 1",
    "appId": "com.webos.app.hdmi1",
    "icon": "hdmi",
    "kind": "utility",
    "section": "tv",
    "detail": "External input"
  },
  {
    "label": "HDMI 2",
    "appId": "com.webos.app.hdmi2",
    "icon": "soundbar",
    "kind": "utility",
    "section": "tv",
    "detail": "Soundbar"
  },
  {
    "label": "Live TV",
    "appId": "com.webos.app.livetv",
    "icon": "tv",
    "kind": "utility",
    "section": "tv",
    "detail": "Channels & guide"
  }
],
};
