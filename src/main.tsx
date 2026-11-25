import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
import "./presentation/workstation.css";
import "./presentation/peak-workstation.css";
import "./presentation/peak-secondary-pages.css";

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
