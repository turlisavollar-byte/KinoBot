import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const dashboardPortValue =
  process.env.DASHBOARD_PORT ?? process.env.PORT ?? "3000";
const dashboardPort = Number(dashboardPortValue);

if (Number.isNaN(dashboardPort) || dashboardPort <= 0) {
  throw new Error(`Invalid DASHBOARD_PORT value: "${dashboardPortValue}"`);
}

const basePath = process.env.BASE_PATH || "/";
const apiPortValue = process.env.API_PORT ?? "8080";
const apiPort = Number(apiPortValue);

if (Number.isNaN(apiPort) || apiPort <= 0) {
  throw new Error(`Invalid API_PORT value: "${apiPortValue}"`);
}

export default defineConfig({
  base: basePath,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("@tanstack/react-query") ||
            id.includes("lucide-react") ||
            id.includes("framer-motion")
          ) {
            return "vendor-react";
          }

          if (
            id.includes("tailwindcss") ||
            id.includes("@tailwindcss") ||
            id.includes("cmdk") ||
            id.includes("@radix-ui")
          ) {
            return "vendor-ui";
          }

          return undefined;
        },
      },
      onwarn(warning, warn) {
        if (
          warning.code === "SOURCEMAP_ERROR" &&
          typeof warning.message === "string" &&
          warning.message.includes(
            "Error when using sourcemap for reporting an error",
          )
        ) {
          return;
        }
        warn(warning);
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: dashboardPort,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        secure: false,
        configure(proxy) {
          proxy.on("proxyReq", (proxyRequest) => {
            proxyRequest.removeHeader("origin");
          });
          proxy.on("error", (err, req, res) => {
            console.error("Proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log(
              "Proxying request:",
              req.method,
              req.url,
              "->",
              proxyReq.path,
            );
          });
        },
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port: dashboardPort,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
