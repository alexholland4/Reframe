/**
 * Luna service bridge.
 *
 * On the TV, webOS exposes a service bus reachable through the global
 * `webOS.service.request` (provided by webOSTV.js). In a desktop browser that
 * global does not exist, so we fall back to mocks. This lets the entire UI be
 * built and iterated on a laptop with zero TV contact, which is the whole point
 * of Phase 1.
 *
 * Nothing here needs root. App launch and input switching both go through the
 * public applicationManager API, which Developer Mode already permits.
 */

export interface LunaRequestOptions {
  method: string;
  parameters?: Record<string, unknown>;
}

type WebOSBridge = {
  service: {
    request: (
      uri: string,
      opts: {
        method: string;
        parameters?: Record<string, unknown>;
        onSuccess?: (res: unknown) => void;
        onFailure?: (err: unknown) => void;
      }
    ) => void;
  };
};

declare global {
  interface Window {
    webOS?: WebOSBridge;
  }
}

export const isOnTV = (): boolean =>
  typeof window !== "undefined" && typeof window.webOS?.service?.request === "function";

/** Promise wrapper around a single Luna call. Rejects on failure or timeout. */
export function luna<T = unknown>(
  service: string,
  { method, parameters = {} }: LunaRequestOptions,
  timeoutMs = 4000
): Promise<T> {
  if (!isOnTV()) {
    return mockLuna<T>(service, method, parameters);
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`luna timeout: ${service}/${method}`)),
      timeoutMs
    );
    window.webOS!.service.request(`luna://${service}`, {
      method,
      parameters,
      onSuccess: (res) => {
        clearTimeout(timer);
        resolve(res as T);
      },
      onFailure: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Browser mocks — only used off-TV                                        */
/* ---------------------------------------------------------------------- */

function mockLuna<T>(
  service: string,
  method: string,
  params: Record<string, unknown>
): Promise<T> {
  // eslint-disable-next-line no-console
  console.info(`[luna mock] ${service}/${method}`, params);
  return Promise.resolve({ returnValue: true } as T);
}
