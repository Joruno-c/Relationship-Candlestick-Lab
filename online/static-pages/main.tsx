import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

const container = document.getElementById("root");
if (!container) throw new Error("页面挂载节点缺失。");

createRoot(container).render(<StrictMode><Home /></StrictMode>);
