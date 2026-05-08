import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { readRuntimeConfig, type RuntimeConfig } from "./runtime-config";
import { getRouter } from "./router";
import "./app.css";

export interface CreateAppOptions {
  runtimeConfig?: RuntimeConfig;
}

export function createApp(options: CreateAppOptions = {}) {
  const runtimeConfig = options.runtimeConfig ?? readRuntimeConfig();
  const router = getRouter(runtimeConfig);

  return {
    router,
    runtimeConfig,
    title: "Yona Rust Frontend",
  };
}

export function mountApp(container: Element, options: CreateAppOptions = {}) {
  const { router } = createApp(options);
  return createRoot(container).render(<RouterProvider router={router} />);
}

if (typeof document !== "undefined") {
  const mountNode = document.getElementById("root");

  if (mountNode) {
    mountApp(mountNode);
  }
}
