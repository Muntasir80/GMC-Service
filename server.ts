import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware
  app.use(express.json());

  // API routes can go here if needed
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.resolve(__dirname, 'dist');
    const fs = await import("fs");
    
    if (fs.existsSync(distPath)) {
      console.log(`Serving static files from: ${distPath}`);
      app.use(express.static(distPath));
    } else {
      console.error(`ERROR: dist directory not found at ${distPath}`);
    }
    
    // Fallback for SPA routing
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        console.log(`Fallback: serving ${indexPath} for path ${req.path}`);
        res.sendFile(indexPath);
      } else {
        console.error(`ERROR: index.html not found at ${indexPath}`);
        res.status(404).send("Application shell not found. Please ensure the app is built.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
