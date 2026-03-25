import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Los tests de integración requieren la variable DATABASE_URL del .env
    env: loadEnv(),
    globals: true,
    // jsdom para tests de componentes React
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "./src") + "/",
      "@app/": path.resolve(__dirname, "./app") + "/",
    },
  },
});

function loadEnv(): Record<string, string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dotenv = require("dotenv");
    const result = dotenv.config({ path: ".env" });
    return result.parsed ?? {};
  } catch {
    return {};
  }
}
