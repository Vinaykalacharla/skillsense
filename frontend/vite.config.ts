import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, "..");
  const env = loadEnv(mode, envDir, "");
  const backendUrl = env.BACKEND_URL || env.VITE_API_BASE_URL || "http://localhost:5000";

  return {
    base: "/",
    envDir,
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
        "/uploads": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
