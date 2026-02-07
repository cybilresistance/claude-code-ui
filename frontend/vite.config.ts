import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "frontend",
  resolve: {
    alias: {
      "shared": path.resolve(__dirname, "..", "shared"),
    },
  },
  server: {
    port: 3000,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:3002",
    },
  },
});
