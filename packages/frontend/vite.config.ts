import react from "@vitejs/plugin-react";
import path from "path";
import AutoImports from "unplugin-auto-import/vite";
import { defineConfig } from "vite";
import faroUploader from "@grafana/faro-rollup-plugin";
import { VitePWA } from "vite-plugin-pwa";
import viteCompression from "vite-plugin-compression";

const PORT = process.env.PORT ?? 9001;
const FARO_API_KEY = process.env.FARO_API_KEY;

export default defineConfig({
  build: {
    sourcemap: true,
    target: "esnext",
  },
  preview: {
    port: +PORT,
    proxy: {
      "/api": {
        target: "https://c.plhh.org",
        changeOrigin: true,
        secure: true,
      },
      "/ws": {
        target: "wss://api-c.plhh.org",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "~": path.resolve(import.meta.dirname, "./"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  plugins: [
    viteCompression(),
    VitePWA({
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Chat room",
        short_name: "Chat",
        description:
          "Chat web application. Send receive message from your friends immediately.",
        theme_color: "#000",
        icons: [
          {
            src: "icon.svg",
            sizes: "192x192",
            type: "image/svg",
            purpose: "maskable any",
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg",
          },
        ],
      },
    }),
    react(),
    AutoImports({
      dts: true, // or a custom path
      include: [
        // /\.*.$/,
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      ],
      imports: [
        "react",
        "react-router-dom",
        {
          moment: [["default", "moment"]],
        },
        {
          "usehooks-ts": [
            "useIntersectionObserver",
            "useLocalStorage",
            "useMediaQuery",
            "usePrevious",
            "useWindowSize",
          ],
          "@/components/ui/chakra-compat": [
            "createStandaloneToast",
            "extendTheme",
            "ChakraProvider",
            "Spinner",
            "Textarea",
            "Button",
            "FormControl",
            "FormLabel",
            "Input",
            "IconButton",
            "Stack",
            "useToast",
            "Modal",
            "ModalOverlay",
            "ModalContent",
            "ModalHeader",
            "ModalBody",
            "ModalFooter",
            "ModalCloseButton",
            "useDisclosure",
            "Popover",
            "PopoverTrigger",
            "PopoverContent",
            "PopoverArrow",
            "PopoverCloseButton",
            "PopoverHeader",
            "PopoverBody",
            "PopoverFooter",
          ],
        },
        {
          axios: [["default", "Axios"]],
          clsx: [["default", "clsx"]],
          "@/components/Avatar": [["Avatar", "Avatar"]],
        },
      ],
      dirs: [
        "./src/views",
        "./src/interfaces",
        "./src/hooks",
        "./src/components",
      ],
      eslintrc: {
        enabled: true,
      },
    }),
    ...(FARO_API_KEY
      ? [
          faroUploader({
            appName: process.env.FARO_APP_NAME ?? "c.plhh.org",
            endpoint:
              process.env.FARO_ENDPOINT ??
              "https://faro-api-prod-ap-northeast-0.grafana.net/faro/api/v1",
            appId: process.env.FARO_APP_ID ?? "c.plhh.org",
            stackId: process.env.FARO_STACK_ID ?? "1227052",
            apiKey: FARO_API_KEY,
            gzipContents: true,
          }),
        ]
      : []),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        // target: "https://45.76.110.22/",
        // target: "https://c.plhh.org",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, "/"),
      },
      "/ws": {
        target: "ws://localhost:8000/",
        // target: "ws://45.76.110.22:8000/",
        // target: "wss://api-c.plhh.org",
        changeOrigin: true,
        // secure: true,
      },
    },
    port: +PORT,
  },
});
