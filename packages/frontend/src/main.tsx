import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";

if (import.meta.env.PROD) {
  const initGrafana = () => {
    import("./utils/grafana");
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(initGrafana);
  } else {
    setTimeout(initGrafana, 0);
  }
}

const rootDom = document.querySelector("#root")!;
createRoot(rootDom).render(<App />);
