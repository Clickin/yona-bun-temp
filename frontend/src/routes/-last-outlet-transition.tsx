import { AnimatePresence, LazyMotion, domMax, m, useReducedMotion } from "framer-motion";
import { Outlet, useMatches, useRouterState } from "@tanstack/react-router";

export function LastOutletTransition({ routeId }: { routeId: string }) {
  const isLastOutlet = useMatches({
    select: (matches) => matches.length > 1 && matches.at(-2)?.routeId === routeId,
  });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const shouldReduceMotion = useReducedMotion();

  if (!isLastOutlet || shouldReduceMotion) {
    return <Outlet />;
  }

  return (
    <LazyMotion features={domMax} strict>
      <AnimatePresence mode="popLayout">
        <m.div
          key={pathname}
          data-last-outlet-transition="true"
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
        >
          <Outlet />
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
