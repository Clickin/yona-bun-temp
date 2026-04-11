import * as React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { setCurrentSessionData } from "@app/lib/auth-shared";
import { useTranslate } from "@app/lib/i18n-react";
import { setMyDefaultLandingPreference } from "@app/lib/me";
import { currentSessionQueryOptions } from "@app/lib/queries";
import { normalizeDefaultLandingPath } from "@yona/domain";

export function DefaultLandingAction() {
  const router = useRouter();
  const queryClient = router.options.context.queryClient;
  const currentHref = useRouterState({
    select: (state) => state.location.href,
  });
  const session = useSuspenseQuery(currentSessionQueryOptions(router.options.context.authCaller));
  const t = useTranslate();
  const [pending, setPending] = React.useState(false);

  const candidatePath = normalizeDefaultLandingPath(currentHref);
  if (
    session.data.isAnonymous ||
    !candidatePath ||
    session.data.defaultLandingPath === candidatePath
  ) {
    return null;
  }

  return (
    <button
      aria-label={`${t("app.settings.setDefaultLanding")}: ${candidatePath}`}
      className="secondary-cta"
      disabled={pending}
      onClick={() => {
        setPending(true);
        React.startTransition(() => {
          void (async () => {
            try {
              const result = await setMyDefaultLandingPreference({
                data: {
                  path: candidatePath,
                },
              });

              setCurrentSessionData(queryClient, {
                ...session.data,
                defaultLandingPath: result.path,
              });
            } finally {
              setPending(false);
            }
          })();
        });
      }}
      type="button"
    >
      {pending ? t("app.settings.saving") : t("app.settings.setDefaultLanding")}
    </button>
  );
}
