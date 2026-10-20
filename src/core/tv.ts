/**
 * TV control actions, built on the Luna bridge.
 *
 * All of these use the public applicationManager API and require no root:
 *   - launching a streaming app  = launch its app id
 *   - switching to an HDMI input  = launch the input's built-in "app" id
 *     (webOS models HDMI/live inputs as system apps, e.g. com.webos.app.hdmi1)
 */

import { luna } from "./luna.js";

const APP_MANAGER = "com.webos.applicationManager";

export async function launchApp(
  appId: string,
  params: Record<string, unknown> = {}
): Promise<void> {
  await luna(APP_MANAGER, {
    method: "launch",
    parameters: { id: appId, params },
  });
}

/** HDMI inputs are launched as apps: com.webos.app.hdmi1 .. hdmi4 */
export async function switchToHdmi(port: 1 | 2 | 3 | 4): Promise<void> {
  await launchApp(`com.webos.app.hdmi${port}`);
}

/** Live TV / tuner input. */
export async function switchToLiveTv(): Promise<void> {
  await launchApp("com.webos.app.livetv");
}

/** Open a specific settings page where supported (e.g. "network", "picture"). */
export async function openSettings(page?: string): Promise<void> {
  // App ID confirmed by this TV's installed-app inventory.
  await launchApp("com.palm.app.settings", page ? { target: page } : {});
}
