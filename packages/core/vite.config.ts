import { defineConfig } from "vite";
import pkg from "./package.json";

export default defineConfig({
  mode: "development", // production
  build: {
    // watch: {
    //   include: ["src/**", "package.json"],
    // },
    rollupOptions: {
      external: ["ws"],
    },
    sourcemap: true,
    minify: false,
    // emptyOutDir: false,
    // target: "node16",
    lib: {
      entry: "./src/index.ts",
      // entry: ["./src/index.ts", "./src/socketServer.ts", "./src/socketClient.ts"],
      name: "ws",
      fileName: "index",
      // formats: ["es", "umd", "cjs"],
    },
  },
});
