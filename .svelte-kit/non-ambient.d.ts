// this file is generated — do not edit it

declare module "svelte/elements" {
  export interface HTMLAttributes<T> {
    "data-sveltekit-keepfocus"?: true | "" | "off" | undefined | null;
    "data-sveltekit-noscroll"?: true | "" | "off" | undefined | null;
    "data-sveltekit-preload-code"?:
      | true
      | ""
      | "eager"
      | "viewport"
      | "hover"
      | "tap"
      | "off"
      | undefined
      | null;
    "data-sveltekit-preload-data"?: true | "" | "hover" | "tap" | "off" | undefined | null;
    "data-sveltekit-reload"?: true | "" | "off" | undefined | null;
    "data-sveltekit-replacestate"?: true | "" | "off" | undefined | null;
  }
}

export {};

declare module "$app/types" {
  export interface AppTypes {
    RouteId():
      | "/"
      | "/api"
      | "/api/repos"
      | "/api/repos/[repoId]"
      | "/api/repos/[repoId]/bootstrap"
      | "/api/repos/[repoId]/files"
      | "/api/repos/[repoId]/inline-edit"
      | "/api/repos/[repoId]/smart-http"
      | "/api/repos/[repoId]/smart-http/[...gitPath]"
      | "/help"
      | "/login"
      | "/organizations"
      | "/projects";
    RouteParams(): {
      "/api/repos/[repoId]": { repoId: string };
      "/api/repos/[repoId]/bootstrap": { repoId: string };
      "/api/repos/[repoId]/files": { repoId: string };
      "/api/repos/[repoId]/inline-edit": { repoId: string };
      "/api/repos/[repoId]/smart-http": { repoId: string };
      "/api/repos/[repoId]/smart-http/[...gitPath]": { repoId: string; gitPath: string };
    };
    LayoutParams(): {
      "/": { repoId?: string; gitPath?: string };
      "/api": { repoId?: string; gitPath?: string };
      "/api/repos": { repoId?: string; gitPath?: string };
      "/api/repos/[repoId]": { repoId: string; gitPath?: string };
      "/api/repos/[repoId]/bootstrap": { repoId: string };
      "/api/repos/[repoId]/files": { repoId: string };
      "/api/repos/[repoId]/inline-edit": { repoId: string };
      "/api/repos/[repoId]/smart-http": { repoId: string; gitPath?: string };
      "/api/repos/[repoId]/smart-http/[...gitPath]": { repoId: string; gitPath: string };
      "/help": Record<string, never>;
      "/login": Record<string, never>;
      "/organizations": Record<string, never>;
      "/projects": Record<string, never>;
    };
    Pathname():
      | "/"
      | (`/api/repos/${string}/bootstrap` & {})
      | (`/api/repos/${string}/files` & {})
      | (`/api/repos/${string}/inline-edit` & {})
      | (`/api/repos/${string}/smart-http/${string}` & {})
      | "/help"
      | "/login"
      | "/organizations"
      | "/projects";
    ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes["Pathname"]>}`;
    Asset():
      | "/favicon.ico"
      | "/images/yona_logo.png"
      | "/robots.txt"
      | "/stylesheets/yobicon/Read Me.txt"
      | "/stylesheets/yobicon/fonts/yobicon.dev.svg"
      | "/stylesheets/yobicon/fonts/yobicon.eot"
      | "/stylesheets/yobicon/fonts/yobicon.svg"
      | "/stylesheets/yobicon/fonts/yobicon.ttf"
      | "/stylesheets/yobicon/fonts/yobicon.woff"
      | "/stylesheets/yobicon/index.html"
      | "/stylesheets/yobicon/license.txt"
      | "/stylesheets/yobicon/lte-ie7.js"
      | "/stylesheets/yobicon/style.css"
      | (string & {});
  }
}
