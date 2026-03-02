import type { SessionLocals } from "$lib/server/auth/session-helper";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      session?: SessionLocals;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
