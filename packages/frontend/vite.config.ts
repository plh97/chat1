import react from "@vitejs/plugin-react";
import path from "path";
import AutoImports from "unplugin-auto-import/vite";
import { defineConfig } from "vite";
// import { VitePWA } from "vite-plugin-pwa";
// import viteCompression from "vite-plugin-compression";

const PROT = +(process.env.PORT ?? 9001);

export default defineConfig({
  build: {
    sourcemap: true,
    target: "modules",
  },
  preview: {
    port: PROT,
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
            "Avatar",
            "Button",
            "FormControl",
            "FormLabel",
            "Input",
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
            "Formik",
          ],
        },
        {
          axios: [["default", "Axios"]],
          classnames: [["default", "classnames"]],
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
  ],
  server: {
    proxy: {
      "/static": {
        target: "https://localhost",
        // target: "https://18.141.225.236",
        changeOrigin: true,
        secure: false,
        // rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
      "/api": {
        // target: "https://localhost",
        target: "https://18.141.225.236",
        changeOrigin: true,
        secure: false,
        // rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
      "/ws": {
        // target: "ws://localhost",
        target: "wss://18.141.225.236",
        changeOrigin: true,
        secure: false,
      },
    },
    port: PROT,
  },
});
