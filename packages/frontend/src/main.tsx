import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";
import "./utils/grafana";

const rootDom = document.querySelector("#root")!;
createRoot(rootDom).render(<App />);
