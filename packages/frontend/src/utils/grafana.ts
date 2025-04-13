import { matchRoutes } from "react-router-dom";
import {
  initializeFaro,
  createReactRouterV6DataOptions,
  ReactIntegration,
  getWebInstrumentations,
} from "@grafana/faro-react";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";

initializeFaro({
  url: "https://faro-collector-prod-ap-northeast-0.grafana.net/collect/e331db87baa60fc72abb89d75653512a",
  app: {
    name: "c.plhh.org",
    version: "1.0.0",
    environment: "production",
  },

  instrumentations: [
    // Mandatory, omits default instrumentations otherwise.
    ...getWebInstrumentations(),

    // Tracing package to get end-to-end visibility for HTTP requests.
    new TracingInstrumentation(),

    // React integration for React applications.
    new ReactIntegration({
      router: createReactRouterV6DataOptions({
        matchRoutes,
      }),
    }),
  ],
});
