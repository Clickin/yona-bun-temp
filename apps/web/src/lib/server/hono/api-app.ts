import { Hono } from "hono";
import { authApp } from "./auth-app";
import { repoApp } from "./repo-app";

export const apiApp = new Hono();

apiApp.route("/", authApp);
apiApp.route("/", repoApp);
