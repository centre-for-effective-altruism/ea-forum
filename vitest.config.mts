import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // TODO flag in PR or revert
    watch: false,
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/permissions-model/fm-lite.ts"],
      thresholds: {
        "src/permissions-model/fm-lite.ts": {
          statements: 99,
          branches: 99,
          functions: 99,
          lines: 99,
        },
      },
    },
  },
});
