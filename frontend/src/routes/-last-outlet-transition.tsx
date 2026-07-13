import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
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
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence initial={false} mode="wait">
        <m.div
          key={pathname}
          data-last-outlet-transition="true"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={{ duration: 0.16, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ willChange: "opacity, transform" }}
        >
          <Outlet />
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
