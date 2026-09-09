import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        app: {
          background: { value: "#000000" },
          panel: { value: "#1e293b" },
          muted: { value: "#334155" },
          emphasized: { value: "#475569" },
          border: { value: "#0f172a" },
          foreground: { value: "#f8fafc" },
          subdued: { value: "#94a3b8" },
        },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: "{colors.app.background}" },
          subtle: { value: "{colors.app.border}" },
          muted: { value: "{colors.app.panel}" },
          emphasized: { value: "{colors.app.muted}" },
          panel: { value: "{colors.app.panel}" },
        },
        fg: {
          DEFAULT: { value: "{colors.app.foreground}" },
          muted: { value: "{colors.app.subdued}" },
          subtle: { value: "{colors.app.emphasized}" },
        },
        border: {
          DEFAULT: { value: "{colors.app.muted}" },
          muted: { value: "{colors.app.border}" },
          subtle: { value: "{colors.app.panel}" },
          emphasized: { value: "{colors.app.emphasized}" },
        },
        gray: {
          contrast: { value: "{colors.app.foreground}" },
          fg: { value: "{colors.app.foreground}" },
          subtle: { value: "{colors.app.border}" },
          muted: { value: "{colors.app.panel}" },
          emphasized: { value: "{colors.app.emphasized}" },
          solid: { value: "{colors.app.muted}" },
          focusRing: { value: "{colors.app.subdued}" },
          border: { value: "{colors.app.muted}" },
        },
      },
    },
  },
});

const theme = createSystem(defaultConfig, config);

export default theme;
