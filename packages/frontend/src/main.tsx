import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";

const rootDom = document.querySelector("#root")!;
createRoot(rootDom).render(<App />);
