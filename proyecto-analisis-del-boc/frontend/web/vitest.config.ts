import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Los tests de integración requieren la variable DATABASE_URL del .env
    env: loadEnv(),
    globals: true,
    // Separa tests unitarios (sin BD) de tests de integración
    // Ejecutar solo unitarios: vitest run --project unit
    // Ejecutar integración: vitest run --project integration
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
