import fs from "node:fs";

// Shared by every image-upload route (Thumbnail/Banner/Key Feature icon) so JPG/PNG/WEBP/SVG
// are all accepted consistently — check file.mimetype against this before saving.
export const IMAGE_MIMETYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

// SVG is XML, not a pixel format — a browser will execute <script>, on*="" handlers, and
// javascript: URIs inside one if it's ever opened directly (not just rendered via <img>).
// Strip that content right after upload so a stored SVG can never carry an XSS payload,
// regardless of how it's later loaded.
export function sanitizeIfSvg(filePath: string, mimetype: string) {
  if (mimetype !== "image/svg+xml" && !filePath.toLowerCase().endsWith(".svg")) return;
  let svg = fs.readFileSync(filePath, "utf8");
  svg = svg.replace(/<script[\s\S]*?<\/script\s*>/gi, "");
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "");
  svg = svg.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  svg = svg.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  svg = svg.replace(/(xlink:href|href)\s*=\s*"javascript:[^"]*"/gi, "");
  svg = svg.replace(/(xlink:href|href)\s*=\s*'javascript:[^']*'/gi, "");
  fs.writeFileSync(filePath, svg, "utf8");
}
