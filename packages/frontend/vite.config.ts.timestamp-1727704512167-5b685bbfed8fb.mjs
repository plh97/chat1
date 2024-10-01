// vite.config.ts
import react from "file:///Users/pengliheng/study/chat1/node_modules/.pnpm/@vitejs+plugin-react@2.2.0_vite@5.4.8_@types+node@18.19.54_terser@5.34.1_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import path from "path";
import AutoImports from "file:///Users/pengliheng/study/chat1/node_modules/.pnpm/unplugin-auto-import@0.12.2_rollup@3.29.5/node_modules/unplugin-auto-import/dist/vite.js";
import { defineConfig } from "file:///Users/pengliheng/study/chat1/node_modules/.pnpm/vite@5.4.8_@types+node@18.19.54_terser@5.34.1/node_modules/vite/dist/node/index.js";
import { VitePWA } from "file:///Users/pengliheng/study/chat1/node_modules/.pnpm/vite-plugin-pwa@0.14.7_vite@5.4.8_@types+node@18.19.54_terser@5.34.1__workbox-build@6.6.0_@ty_otj4itpflfp6m7sbetzm4g2pde/node_modules/vite-plugin-pwa/dist/index.mjs";
import viteCompression from "file:///Users/pengliheng/study/chat1/node_modules/.pnpm/vite-plugin-compression@0.5.1_vite@5.4.8_@types+node@18.19.54_terser@5.34.1_/node_modules/vite-plugin-compression/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/pengliheng/study/chat1/packages/frontend";
var PROT = Number(process.env.PORT ?? 9001);
var vite_config_default = defineConfig({
  build: {
    sourcemap: true
    // target: "modules",
  },
  preview: {
    port: PROT
  },
  resolve: {
    alias: {
      "~": path.resolve(__vite_injected_original_dirname, "./"),
      "@": path.resolve(__vite_injected_original_dirname, "src")
    }
  },
  plugins: [
    viteCompression(),
    VitePWA({
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Chat room",
        short_name: "Chat",
        description: "Chat web application. Send receive message from your friends immediately.",
        theme_color: "#000",
        icons: [
          {
            src: "icon.svg",
            sizes: "192x192",
            type: "image/svg",
            purpose: "maskable any"
          },
          {
            src: "icon.svg",
            sizes: "512x512",
            type: "image/svg"
          }
        ]
      }
    }),
    react(),
    AutoImports({
      include: [/\.*.$/],
      imports: [
        "react",
        "react-router-dom",
        {
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
            "Formik"
          ]
        },
        {
          axios: [["default", "Axios"]],
          classnames: [["default", "classnames"]]
        }
      ],
      dirs: [
        "./src/views",
        "./src/interfaces",
        "./src/hooks",
        "./src/components"
      ],
      eslintrc: {
        enabled: true
      }
    })
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        secure: false
        // rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
      "/socket.io": {
        target: "ws://127.0.0.1:8080",
        changeOrigin: true,
        secure: false
      }
    },
    port: PROT
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcGVuZ2xpaGVuZy9zdHVkeS9jaGF0MS9wYWNrYWdlcy9mcm9udGVuZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3BlbmdsaWhlbmcvc3R1ZHkvY2hhdDEvcGFja2FnZXMvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3BlbmdsaWhlbmcvc3R1ZHkvY2hhdDEvcGFja2FnZXMvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IEF1dG9JbXBvcnRzIGZyb20gXCJ1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlXCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcbmltcG9ydCB2aXRlQ29tcHJlc3Npb24gZnJvbSBcInZpdGUtcGx1Z2luLWNvbXByZXNzaW9uXCI7XG5cbmNvbnN0IFBST1QgPSBOdW1iZXIocHJvY2Vzcy5lbnYuUE9SVCA/PyA5MDAxKTtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgYnVpbGQ6IHtcbiAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgLy8gdGFyZ2V0OiBcIm1vZHVsZXNcIixcbiAgfSxcbiAgcHJldmlldzoge1xuICAgIHBvcnQ6IFBST1QsXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJ+XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9cIiksXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJzcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgcGx1Z2luczogW1xuICAgIHZpdGVDb21wcmVzc2lvbigpLFxuICAgIFZpdGVQV0Eoe1xuICAgICAgaW5jbHVkZUFzc2V0czogW1wiaWNvbi5zdmdcIl0sXG4gICAgICBtYW5pZmVzdDoge1xuICAgICAgICBuYW1lOiBcIkNoYXQgcm9vbVwiLFxuICAgICAgICBzaG9ydF9uYW1lOiBcIkNoYXRcIixcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgXCJDaGF0IHdlYiBhcHBsaWNhdGlvbi4gU2VuZCByZWNlaXZlIG1lc3NhZ2UgZnJvbSB5b3VyIGZyaWVuZHMgaW1tZWRpYXRlbHkuXCIsXG4gICAgICAgIHRoZW1lX2NvbG9yOiBcIiMwMDBcIixcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6IFwiaWNvbi5zdmdcIixcbiAgICAgICAgICAgIHNpemVzOiBcIjE5MngxOTJcIixcbiAgICAgICAgICAgIHR5cGU6IFwiaW1hZ2Uvc3ZnXCIsXG4gICAgICAgICAgICBwdXJwb3NlOiBcIm1hc2thYmxlIGFueVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3JjOiBcImljb24uc3ZnXCIsXG4gICAgICAgICAgICBzaXplczogXCI1MTJ4NTEyXCIsXG4gICAgICAgICAgICB0eXBlOiBcImltYWdlL3N2Z1wiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pLFxuICAgIHJlYWN0KCksXG4gICAgQXV0b0ltcG9ydHMoe1xuICAgICAgaW5jbHVkZTogWy9cXC4qLiQvXSxcbiAgICAgIGltcG9ydHM6IFtcbiAgICAgICAgXCJyZWFjdFwiLFxuICAgICAgICBcInJlYWN0LXJvdXRlci1kb21cIixcbiAgICAgICAge1xuICAgICAgICAgIFwiQGNoYWtyYS11aS9yZWFjdFwiOiBbXG4gICAgICAgICAgICBcImNyZWF0ZVN0YW5kYWxvbmVUb2FzdFwiLFxuICAgICAgICAgICAgXCJleHRlbmRUaGVtZVwiLFxuICAgICAgICAgICAgXCJDaGFrcmFQcm92aWRlclwiLFxuICAgICAgICAgICAgXCJTcGlubmVyXCIsXG4gICAgICAgICAgICBcIlRleHRhcmVhXCIsXG4gICAgICAgICAgICBcIkF2YXRhclwiLFxuICAgICAgICAgICAgXCJCdXR0b25cIixcbiAgICAgICAgICAgIFwiRm9ybUNvbnRyb2xcIixcbiAgICAgICAgICAgIFwiRm9ybUxhYmVsXCIsXG4gICAgICAgICAgICBcIklucHV0XCIsXG4gICAgICAgICAgICBcIlN0YWNrXCIsXG4gICAgICAgICAgICBcInVzZVRvYXN0XCIsXG4gICAgICAgICAgICBcIk1vZGFsXCIsXG4gICAgICAgICAgICBcIk1vZGFsT3ZlcmxheVwiLFxuICAgICAgICAgICAgXCJNb2RhbENvbnRlbnRcIixcbiAgICAgICAgICAgIFwiTW9kYWxIZWFkZXJcIixcbiAgICAgICAgICAgIFwiTW9kYWxCb2R5XCIsXG4gICAgICAgICAgICBcIk1vZGFsRm9vdGVyXCIsXG4gICAgICAgICAgICBcIk1vZGFsQ2xvc2VCdXR0b25cIixcbiAgICAgICAgICAgIFwidXNlRGlzY2xvc3VyZVwiLFxuICAgICAgICAgICAgXCJGb3JtaWtcIixcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgYXhpb3M6IFtbXCJkZWZhdWx0XCIsIFwiQXhpb3NcIl1dLFxuICAgICAgICAgIGNsYXNzbmFtZXM6IFtbXCJkZWZhdWx0XCIsIFwiY2xhc3NuYW1lc1wiXV0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgZGlyczogW1xuICAgICAgICBcIi4vc3JjL3ZpZXdzXCIsXG4gICAgICAgIFwiLi9zcmMvaW50ZXJmYWNlc1wiLFxuICAgICAgICBcIi4vc3JjL2hvb2tzXCIsXG4gICAgICAgIFwiLi9zcmMvY29tcG9uZW50c1wiLFxuICAgICAgXSxcbiAgICAgIGVzbGludHJjOiB7XG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICB9LFxuICAgIH0pLFxuICBdLFxuICBzZXJ2ZXI6IHtcbiAgICBwcm94eToge1xuICAgICAgXCIvYXBpXCI6IHtcbiAgICAgICAgdGFyZ2V0OiBcImh0dHA6Ly8xMjcuMC4wLjE6ODA4MFwiLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIC8vIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCBcIi9hcGlcIiksXG4gICAgICB9LFxuICAgICAgXCIvc29ja2V0LmlvXCI6IHtcbiAgICAgICAgdGFyZ2V0OiBcIndzOi8vMTI3LjAuMC4xOjgwODBcIixcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHBvcnQ6IFBST1QsXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1QsT0FBTyxXQUFXO0FBQ2pWLE9BQU8sVUFBVTtBQUNqQixPQUFPLGlCQUFpQjtBQUN4QixTQUFTLG9CQUFvQjtBQUM3QixTQUFTLGVBQWU7QUFDeEIsT0FBTyxxQkFBcUI7QUFMNUIsSUFBTSxtQ0FBbUM7QUFPekMsSUFBTSxPQUFPLE9BQU8sUUFBUSxJQUFJLFFBQVEsSUFBSTtBQUU1QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixPQUFPO0FBQUEsSUFDTCxXQUFXO0FBQUE7QUFBQSxFQUViO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsRUFDUjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsSUFBSTtBQUFBLE1BQ2pDLEtBQUssS0FBSyxRQUFRLGtDQUFXLEtBQUs7QUFBQSxJQUNwQztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLGdCQUFnQjtBQUFBLElBQ2hCLFFBQVE7QUFBQSxNQUNOLGVBQWUsQ0FBQyxVQUFVO0FBQUEsTUFDMUIsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFDRTtBQUFBLFFBQ0YsYUFBYTtBQUFBLFFBQ2IsT0FBTztBQUFBLFVBQ0w7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLE9BQU87QUFBQSxZQUNQLE1BQU07QUFBQSxZQUNOLFNBQVM7QUFBQSxVQUNYO0FBQUEsVUFDQTtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUFBLElBQ0QsTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLE1BQ1YsU0FBUyxDQUFDLE9BQU87QUFBQSxNQUNqQixTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsVUFDRSxvQkFBb0I7QUFBQSxZQUNsQjtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxRQUNBO0FBQUEsVUFDRSxPQUFPLENBQUMsQ0FBQyxXQUFXLE9BQU8sQ0FBQztBQUFBLFVBQzVCLFlBQVksQ0FBQyxDQUFDLFdBQVcsWUFBWSxDQUFDO0FBQUEsUUFDeEM7QUFBQSxNQUNGO0FBQUEsTUFDQSxNQUFNO0FBQUEsUUFDSjtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFVBQVU7QUFBQSxRQUNSLFNBQVM7QUFBQSxNQUNYO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBO0FBQUEsTUFFVjtBQUFBLE1BQ0EsY0FBYztBQUFBLFFBQ1osUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxNQUFNO0FBQUEsRUFDUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
