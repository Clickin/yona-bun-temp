import * as React from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";

/**
 * Root progress statusbar (legacy NProgress top bar).
 *
 * Two concerns, split deliberately:
 *
 * 1. Bar visibility is GLOBAL: while any active query is fetching, the legacy
 *    top progress bar shows. Every route and component gets the indicator for
 *    free — exactly like legacy Yona's NProgress, which fired on any AJAX
 *    navigation — so no per-screen registration is needed just to see it.
 *
 * 2. The event lock is SCOPED to registered content fetch groups. Screens that
 *    paint a wireframe first and then fetch their content submit the content
 *    query key prefixes via `useWireframeContentProgress`; while a registered
 *    group is fetching, `isLocked` holds and `useLockedLinkClick`/`runLocked`
 *    drop plain left-click triggers so rapid open/closed toggling cannot
 *    restart queries underneath a stale DOM. The group stays locked until the
 *    last query in it settles (allSettled semantics). A global drop would
 *    swallow legitimate clicks during unrelated background refetches, so the
 *    lock is deliberately not global.
 *
 * The whole mechanism is fetch-driven, so it behaves identically for direct
 * URL entry, back/forward history, and in-app navigation alike.
 */
type QueryKeyPrefix = readonly unknown[];

type RootProgressStatusBar = {
  /** Any active query is fetching: the top progress bar is visible. */
  isBarActive: boolean;
  /** A registered content fetch group is in flight: event triggers are dropped. */
  isLocked: boolean;
  /**
   * Arms the lock synchronously at the triggering click. The derived lock only
   * engages once the navigated-to query actually starts fetching, which lags
   * the click by a render cycle — fast local queries can start and settle
   * inside that gap, so the fetch group would never be observed in flight.
   * Holding from the click covers the whole transition window.
   */
  armTransitionLock: () => void;
  /**
   * Releases the click-armed hold. The content route calls this from a layout
   * effect once its list has been committed to the DOM with settled data, so
   * the block never drops between the query settling and the next render tick
   * (the window where the DOM still shows the previous list).
   */
  releaseTransitionLock: () => void;
  registerPrefix: (prefix: QueryKeyPrefix) => () => void;
  runLocked: (action: () => void) => boolean;
};

const RootProgressStatusBarContext = React.createContext<RootProgressStatusBar | null>(null);

export function useRootProgressStatusBar(): RootProgressStatusBar {
  const statusBar = React.use(RootProgressStatusBarContext);
  if (!statusBar) {
    throw new Error("useRootProgressStatusBar must be used under RootProgressStatusBarProvider.");
  }
  return statusBar;
}

function keyStartsWithPrefix(queryKey: readonly unknown[], prefix: readonly unknown[]): boolean {
  if (queryKey.length < prefix.length) {
    return false;
  }
  for (let index = 0; index < prefix.length; index += 1) {
    if (queryKey[index] !== prefix[index]) {
      return false;
    }
  }
  return true;
}

/**
 * One-call helper for wireframe screens: registers the content query key
 * prefixes so the event lock is scoped to this screen's content fetch group
 * for the screen's lifetime. The bar itself needs no registration.
 */
export function useWireframeContentProgress(prefixes: readonly QueryKeyPrefix[]): void {
  const { registerPrefix } = useRootProgressStatusBar();
  const serializedPrefixes = JSON.stringify(prefixes);
  React.useEffect(() => {
    const toRegister = JSON.parse(serializedPrefixes) as QueryKeyPrefix[];
    const unregister = toRegister.map((prefix) => registerPrefix(prefix));
    return () => unregister.forEach((unregisterPrefix) => unregisterPrefix());
  }, [registerPrefix, serializedPrefixes]);
}

/**
 * onClick for a data-fetch-triggering Link: drops the click while the screen's
 * registered content fetch group is in flight. Direct URL entry, back/forward
 * history, and open-in-new-tab clicks (middle button or any modifier) bypass
 * the router entirely and are never blocked here: only plain left clicks honor
 * the lock.
 */
export function useLockedLinkClick(): (event: React.MouseEvent<HTMLElement>) => void {
  const { isLocked } = useRootProgressStatusBar();
  return (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (isLocked) {
      event.preventDefault();
    }
  };
}

export function RootProgressStatusBarProvider({ children }: { children: React.ReactNode }) {
  const [registeredPrefixes, setRegisteredPrefixes] = React.useState<readonly QueryKeyPrefix[]>([]);
  const registeredPrefixesRef = React.useRef<readonly QueryKeyPrefix[]>(registeredPrefixes);

  const registerPrefix = React.useCallback((prefix: QueryKeyPrefix): (() => void) => {
    registeredPrefixesRef.current = [...registeredPrefixesRef.current, prefix];
    setRegisteredPrefixes(registeredPrefixesRef.current);
    let removed = false;
    return () => {
      if (removed) {
        return;
      }
      removed = true;
      registeredPrefixesRef.current = registeredPrefixesRef.current.filter(
        (candidate) => candidate !== prefix,
      );
      setRegisteredPrefixes(registeredPrefixesRef.current);
    };
  }, []);

  const isBarActive = useIsFetching() > 0;

  const fetchGroupActive =
    useIsFetching({
      predicate: (query) =>
        registeredPrefixesRef.current.some((prefix) => keyStartsWithPrefix(query.queryKey, prefix)),
    }) > 0;

  const queryClient = useQueryClient();
  const [transitionLock, setTransitionLock] = React.useState(false);
  const armTransitionLock = React.useCallback(() => setTransitionLock(true), []);
  const releaseTransitionLock = React.useCallback(() => setTransitionLock(false), []);
  const isLocked = transitionLock || fetchGroupActive;

  // Fallback release for clicks that never reach a content commit (e.g. a
  // same-state tab click that does not re-render): one frame later the
  // navigation has committed, so if no registered-prefix query is fetching or
  // pending, nothing is transitioning and the hold drops. The content route's
  // release signal is the primary path and always fires first (layout effect
  // runs before paint, which precedes this frame callback).
  React.useEffect(() => {
    if (!transitionLock) {
      return;
    }
    if (fetchGroupActive) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const pending = queryClient.getQueryCache().findAll({
        predicate: (query) =>
          registeredPrefixesRef.current.some((prefix) =>
            keyStartsWithPrefix(query.queryKey, prefix),
          ) &&
          (query.state.fetchStatus === "fetching" || query.state.status === "pending"),
      });
      if (pending.length === 0) {
        setTransitionLock(false);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [transitionLock, fetchGroupActive, queryClient]);

  const isLockedRef = React.useRef(isLocked);
  isLockedRef.current = isLocked;

  const runLocked = React.useCallback((action: () => void): boolean => {
    if (isLockedRef.current) {
      return false;
    }
    action();
    return true;
  }, []);

  const value = React.useMemo(
    () => ({
      armTransitionLock,
      isBarActive,
      isLocked,
      registerPrefix,
      releaseTransitionLock,
      runLocked,
    }),
    [armTransitionLock, isBarActive, isLocked, registerPrefix, releaseTransitionLock, runLocked],
  );

  return (
    <RootProgressStatusBarContext.Provider value={value}>
      {isBarActive ? (
        <div id="nprogress" aria-hidden="true">
          <div role="presentation" className="bar">
            <div className="peg" />
          </div>
        </div>
      ) : null}
      {children}
    </RootProgressStatusBarContext.Provider>
  );
}
