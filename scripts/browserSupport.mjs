import fs from "node:fs";

export function resolveChromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.platform === "win32" ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" : null,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);

  const executable = candidates.find((candidate) => fs.existsSync(candidate));
  if (!executable) {
    throw new Error(
      "Chrome or Chromium was not found. Install a browser or set CHROME_PATH to its executable."
    );
  }

  return executable;
}
