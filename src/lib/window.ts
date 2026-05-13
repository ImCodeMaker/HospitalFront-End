import { getCurrentWindow } from "@tauri-apps/api/window";

export async function toggleFullscreen() {
  try {
    const win = getCurrentWindow();
    const isFs = await win.isFullscreen();
    await win.setFullscreen(!isFs);
    return !isFs;
  } catch (err) {
    console.error("Fullscreen toggle failed:", err);
    return false;
  }
}

export async function toggleMaximize() {
  try {
    const win = getCurrentWindow();
    await win.toggleMaximize();
  } catch (err) {
    console.error("Maximize toggle failed:", err);
  }
}

export async function minimize() {
  try {
    await getCurrentWindow().minimize();
  } catch (err) {
    console.error("Minimize failed:", err);
  }
}
