import { createFileRoute } from "@tanstack/react-router";
import { ContentCard, ProfileShell } from "@app/components/parity-shells";
import { useTranslate } from "@app/lib/i18n-react";
import { readPublicUserProfile } from "@app/lib/me";

export const Route = createFileRoute("/_app/users/$loginId")({
  loader: ({ params }) =>
    readPublicUserProfile({
      data: {
        loginId: params.loginId,
      },
    }),
  component: PublicUserProfileRouteComponent,
});

function PublicUserProfileRouteComponent() {
  const data = Route.useLoaderData();
  const t = useTranslate();

  return (
    <ProfileShell profile={data}>
      <ContentCard title={t("app.profile.summary")}>
        <p className="note">@{data.loginId}</p>
        <p className="note">
          {t("app.profile.joined", data.joinedAt ? data.joinedAt.toISOString().slice(0, 10) : "-")}
        </p>
      </ContentCard>
      <ContentCard title={t("app.profile.currentAvailability")}>
        <p className="note">{t("app.profile.migrationNote")}</p>
      </ContentCard>
    </ProfileShell>
  );
}
