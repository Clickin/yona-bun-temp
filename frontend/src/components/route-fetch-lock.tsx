import * as React from "react";
import { useIsFetching } from "@tanstack/react-query";

/**
 * Root progress statusbar (legacy NProgress top bar).
 *
 * Screens that paint a wireframe first and then fetch their content submit the
 * content query key prefixes here via `useWireframeContentProgress`; while any
 * registered query is fetching, the legacy top progress bar is shown and
 * `isActive` holds, so the whole mechanism is fetch-driven and works the same
 * for direct URL entry, back/forward history, and in-app navigation alike.
 *
 * `runLocked` drops a data-changing event trigger while a registered fetch
 * group is in flight so rapid issue-list open/closed toggling cannot restart
 * queries underneath a stale DOM; the bar re-enables triggers once everything
 * settles (allSettled semantics — the group stays active until the last query
 * in it finishes).
 */
type QueryKeyPrefix = readonly unknown[];

type RootProgressStatusBar = {
  isActive: boolean;
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
 * prefixes with the root progress statusbar for the screen's lifetime.
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
 * onClick for a data-fetch-triggering Link: drops the click while a registered
 * content fetch group is in flight. Direct URL entry, back/forward history,
 * and open-in-new-tab clicks (middle button or any modifier) bypass the router
 * entirely and are never blocked here: only plain left clicks honor the lock.
 */
export function useLockedLinkClick(): (event: React.MouseEvent<HTMLElement>) => void {
  const { isActive } = useRootProgressStatusBar();
  return (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (isActive) {
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

  const isActive =
    useIsFetching({
      predicate: (query) =>
        registeredPrefixesRef.current.some((prefix) => keyStartsWithPrefix(query.queryKey, prefix)),
    }) > 0;

  const isActiveRef = React.useRef(isActive);
  isActiveRef.current = isActive;

  const runLocked = React.useCallback((action: () => void): boolean => {
    if (isActiveRef.current) {
      return false;
    }
    action();
    return true;
  }, []);

  const value = React.useMemo(
    () => ({ isActive, registerPrefix, runLocked }),
    [isActive, registerPrefix, runLocked],
  );

  return (
    <RootProgressStatusBarContext.Provider value={value}>
      {isActive ? (
        <div id="nprogress" aria-hidden="true">
          <div className="bar" role="presentation">
            <div className="peg" />
          </div>
        </div>
      ) : null}
      {children}
    </RootProgressStatusBarContext.Provider>
  );
}
