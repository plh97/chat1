import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  mode: "development", // production

  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // watch: {
    //   include: ["src/**", "package.json"],
    // },
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
