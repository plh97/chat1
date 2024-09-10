import "./styles/index.css";

import ReactDOM from "react-dom/client";

import { App } from "./App";

const rootDom = document.querySelector("#root") as HTMLElement;

ReactDOM.createRoot(rootDom).render(<App />);
