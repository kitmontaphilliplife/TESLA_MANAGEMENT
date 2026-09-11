import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import "./db.js";
import { packagesRouter } from "./routes/packages.js";
import { productsRouter } from "./routes/products.js";
import { masterCodesRouter } from "./routes/masterCodes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(process.env.UPLOADS_DIR ?? path.join(__dirname, "..", "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/packages", packagesRouter);
app.use("/api/products", productsRouter);
app.use("/api/master-codes", masterCodesRouter);

// In production (or after `cd client && npm run build`) serve the built client from the
// same origin/port as the API — one deployable service, no CORS or second host to manage.
// Local dev keeps using two separate processes (Vite on 5173 proxying to this on 4000),
// so this block only kicks in once client/dist actually exists.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(400).json({ error: err.message ?? "error" });
});

app.listen(PORT, () => {
  console.log(`Package Setting API listening on http://localhost:${PORT}`);
});
