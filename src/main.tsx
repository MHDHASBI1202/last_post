import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Experience from "./experience";
import "./theme.css";

createRoot(document.getElementById("root")!).render(<StrictMode><Experience /></StrictMode>);
