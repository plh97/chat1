import react from "@vitejs/plugin-react";
import path from "path";
import AutoImports from "unplugin-auto-import/vite";
import { defineConfig } from "vite";
import faroUploader from "@grafana/faro-rollup-plugin";
// import { VitePWA } from "vite-plugin-pwa";
// import viteCompression from "vite-plugin-compression";

const PROT = process.env.PORT ?? 9001;

export default defineConfig({
  build: {
    sourcemap: true,
    target: "modules",
  },
  preview: {
    port: +PROT,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    // viteCompression(),
    // VitePWA({
    //   includeAssets: ["icon.svg"],
    //   manifest: {
    //     name: "Chat room",
    //     short_name: "Chat",
    //     description:
    //       "Chat web application. Send receive message from your friends immediately.",
    //     theme_color: "#000",
    //     icons: [
    //       {
    //         src: "icon.svg",
    //         sizes: "192x192",
    //         type: "image/svg",
    //         purpose: "maskable any",
    //       },
    //       {
    //         src: "icon.svg",
    //         sizes: "512x512",
    //         type: "image/svg",
    //       },
    //     ],
    //   },
    // }),
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
          "@chakra-ui/react": [
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
    faroUploader({
      appName: "undefined",
      endpoint: "https://faro-api-prod-ap-northeast-0.grafana.net/faro/api/v1",
      appId: "undefined",
      stackId: "1227052",
      // instructions on how to obtain your API key are in the documentation
      // https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/sourcemap-upload-plugins/#obtain-an-api-key
      apiKey: "$your-api-key",
      gzipContents: true,
    }),
  ],
  server: {
    proxy: {
      "/api": {
        // target: "http://localhost:8000/",
        target: "https://45.76.110.22/",
        // target: "https://c-delta-eight.vercel.app/",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/"),
      },
      "/ws": {
        // target: "ws://localhost:8000/",
        target: "ws://45.76.110.22:8000/",
        // target: "ws://c-delta-eight.vercel.app/",
        changeOrigin: true,
        secure: false,
      },
    },
    port: +PROT,
  },
});
