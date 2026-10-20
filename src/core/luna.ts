/** One-shot Luna requests through the native webOS bridge; desktop previews mock. */
export interface LunaRequestOptions {
  method: string;
  parameters?: Record<string, unknown>;
}

type NativeBridge = {
  onservicecallback: (raw: string) => void;
  call: (uri: string, parameters: string) => void;
  cancel: () => void;
};
type BridgeConstructor = new () => NativeBridge;

declare global {
  interface Window {
    PalmServiceBridge?: BridgeConstructor;
    webOSServiceBridge?: BridgeConstructor;
    PalmSystem?: unknown;
  }
}

// The native bridge must stay alive until the reply or timeout, even after call().
const activeRequests = new Set<NativeBridge>();

function bridgeConstructor(): BridgeConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  if (typeof window.PalmServiceBridge === "function") return window.PalmServiceBridge;
  if (typeof window.webOSServiceBridge === "function") return window.webOSServiceBridge;
  return undefined;
}

/** Detect the TV independently of whether its service bridge is available. */
export function isOnTV(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    bridgeConstructor() || window.PalmSystem ||
    /web[o0]s|smarttv/i.test(window.navigator?.userAgent ?? "")
  );
}

/** Reject denied, malformed, and unanswered calls; never mock a detected TV. */
export function luna<T = unknown>(
  service: string,
  { method, parameters = {} }: LunaRequestOptions,
  timeoutMs = 4000
): Promise<T> {
  const uri = `luna://${service.replace(/\/$/, "")}/${method}`;
  const Constructor = bridgeConstructor();
  if (!Constructor) {
    if (isOnTV()) return Promise.reject(new Error("TV service bridge is unavailable"));
    console.info(`[luna preview] ${uri}`, parameters);
    return Promise.resolve({ returnValue: true } as T);
  }

  return new Promise<T>((resolve, reject) => {
    let bridge: NativeBridge | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    function finish(error?: Error, response?: T): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (bridge) {
        activeRequests.delete(bridge);
        try { bridge.cancel(); } catch { /* Preserve the original result. */ }
      }
      if (error) reject(error);
      else resolve(response as T);
    }

    try {
      bridge = new Constructor();
      activeRequests.add(bridge);
      bridge.onservicecallback = (raw) => {
        if (settled) return;
        let response: unknown;
        try { response = JSON.parse(raw); }
        catch {
          finish(new Error(`Invalid JSON response from ${uri}`));
          return;
        }
        if (!response || typeof response !== "object" || Array.isArray(response)) {
          finish(new Error(`Invalid response from ${uri}`));
          return;
        }
        const result = response as Record<string, unknown>;
        if (result.returnValue !== true ||
            (typeof result.errorCode === "number" && result.errorCode !== 0)) {
          const detail = typeof result.errorText === "string"
            ? result.errorText : "Request did not report success";
          const code = typeof result.errorCode === "number" ? ` (${result.errorCode})` : "";
          finish(new Error(`${detail}${code}`));
          return;
        }
        finish(undefined, response as T);
      };
      timer = setTimeout(() => finish(new Error(`TV request timed out: ${uri}`)), timeoutMs);
      bridge.call(uri, JSON.stringify(parameters));
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
