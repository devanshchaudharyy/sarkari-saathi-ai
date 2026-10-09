// One-time source adjustment: preserve hues while strengthening text contrast.
import { readFile, writeFile } from "node:fs/promises";
const path = "client/src/styles.css";
const css = await readFile(path, "utf8");
function luminance(rgb) {
  const linear = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}
const changes = new Map();
const updated = css.replace(
  /(?<![-\w])color:\s*(#[0-9a-f]{6})(?![0-9a-f])/gi,
  (declaration, hex) => {
    if (hex.toLowerCase() === "#ffffff") return declaration;
    let rgb = hex
      .slice(1)
      .match(/../g)
      .map((n) => parseInt(n, 16));
    while (1.05 / (luminance(rgb) + 0.05) < 5.4)
      rgb = rgb.map((c) => Math.floor(c * 0.96));
    const replacement =
      "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("");
    if (replacement !== hex) changes.set(hex, replacement);
    return `color: ${replacement}`;
  },
);
await writeFile(path, updated);
console.log(`${changes.size} text/icon colors adjusted for contrast.`);
