import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath } from "../runtime-config";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import { SiteLayoutShell } from "./-home-route-screen";
type ExternalLinkTo = NonNullable<React.ComponentProps<typeof Link>["to"]>;
const externalLinkTo = (value: string) => value as unknown as ExternalLinkTo;

const legacyAnswerLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
} as const;
const legacyAnswerLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

export const Route = createFileRoute("/_help")({
  component: HelpTocRoute,
});

function HelpTocRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const router = useRouter();
  const homeHref = prefixBasePath(runtimeConfig.basePath, "/");
  const handleLayoutRootClickCapture = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (!(target instanceof HTMLAnchorElement)) {
        return;
      }
      if (target.className !== "logo logo-letter" || target.getAttribute("href") !== homeHref) {
        return;
      }
      event.preventDefault();
      router.history.push(homeHref);
    },
    [homeHref, router.history],
  );

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <div onClickCapture={handleLayoutRootClickCapture}>
          <HelpTocTitle />
          <SiteLayoutShell runtimeConfig={runtimeConfig}>
            <HelpTocScreen appName={runtimeConfig.siteName ?? "Yoram"} />
          </SiteLayoutShell>
        </div>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function HelpTocTitle() {
  const { t } = useLegacyMessages();
  return <title>{t("title.help")}</title>;
}

function HelpTocScreen({ appName }: { appName: string }) {
  const { t } = useLegacyMessages();
  const infoPath: string = "/info";
  const [openQuestionIndexes, setOpenQuestionIndexes] = React.useState(() => new Set<number>());
  const toggleQuestion = (index: number) => {
    setOpenQuestionIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };
  const isQuestionOpen = (index: number) => openQuestionIndexes.has(index);
  const handleQuestionRowKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, index: number) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleQuestion(index);
    }
  };

  return (
    <>
      <div data-owner="help-shell-breadcrumb-outer">
        <div data-owner="help-shell-breadcrumb-inner">
          <h3 data-owner="help-shell-breadcrumb-heading">{t("title.help")}</h3>
        </div>
      </div>
      <div data-owner="help-shell-page-wrap-outer">
        <div data-owner="help-shell-page-wrap">
          <ul data-owner="help-faq-list">
            <HelpFaqRow
              answer={
                <>
                  {appName}를 설치하고자 하면{" "}
                  <Link
                    href="https://github.com/doortts/yona#korean"
                    to={externalLinkTo("https://github.com/doortts/yona#korean")}
                    reloadDocument
                  >
                    https://github.com/doortts/yona#korean
                  </Link>
                  를 참고해 주세요.
                </>
              }
              index={0}
              isOpen={isQuestionOpen(0)}
              onKeyDown={handleQuestionRowKeyDown}
              onToggle={toggleQuestion}
              question={`${appName}를 설치하고 싶어요.`}
            />
            <HelpFaqRow
              answer={
                <>
                  <p>상단의 "새 프로젝트 시작"을 클릭하신후 필요한 정보를 입력하시면 됩니다.</p>
                  <p>
                    공개설정에서 공개를 택하게 되면 해당 프로젝트의 멤버가 아닌 사용자들도 해당
                    프로젝트를 둘러 볼 수 있게 되며 멤버가 아니라면 코드 저장소를 익명으로 접근하여
                    소스코드를 받아 갈 수는 있지만 소스코드를 수정하지는 못합니다. 공개설정에서
                    비공개를 선택하면 해당 프로젝트의 멤버가 아닌 사용자들은 단지 설명과 이름만을
                    볼수 있습니다.
                  </p>
                  <p>
                    코드 저장소 방식은 현재 Git과 Subversion을 지원합니다. Subversion과 Git은 전
                    세계적으로 널리 쓰이고 있으며 충분한 신뢰성과 성능을 가지고 있습니다.
                  </p>
                  <p>
                    위의 내용을 다 작성하셨다면 "프로젝트 생성" 버튼을 누르면 새로운 프로젝트를
                    생성하실수 있습니다.
                  </p>
                </>
              }
              index={1}
              isOpen={isQuestionOpen(1)}
              onKeyDown={handleQuestionRowKeyDown}
              onToggle={toggleQuestion}
              question="프로젝트를 새로 생성하고 싶어요."
            />
            <HelpFaqRow
              answer={
                <>
                  <Link
                    to="/"
                    activeOptions={legacyAnswerLinkActiveOptions}
                    activeProps={legacyAnswerLinkActiveProps}
                  >
                    메인화면
                  </Link>{" "}
                  우측 하단에 다음과 같이 참여하고 있는 프로젝트의 목록을 볼수 있습니다. 자물쇠가
                  있는 것은 비공개 프로젝트이며 자물쇠가 없는 것은 공개 프로젝트 입니다. 혹은 자신의{" "}
                  <Link
                    to={infoPath}
                    reloadDocument
                    activeOptions={legacyAnswerLinkActiveOptions}
                    activeProps={legacyAnswerLinkActiveProps}
                  >
                    정보 페이지
                  </Link>
                  에서도 확인하실수 있습니다.
                </>
              }
              index={2}
              isOpen={isQuestionOpen(2)}
              onKeyDown={handleQuestionRowKeyDown}
              onToggle={toggleQuestion}
              question="내가 참여하는 프로젝트들은 어디서 볼수 있나요?"
            />
            <HelpFaqRow
              answer={
                <>
                  자신의{" "}
                  <Link
                    to={infoPath}
                    reloadDocument
                    activeOptions={legacyAnswerLinkActiveOptions}
                    activeProps={legacyAnswerLinkActiveProps}
                  >
                    정보 페이지
                  </Link>
                  에서 참여하고 있는 프로젝트 목록을 볼 수있고 탈퇴도 할수 있습니다. 자신이
                  프로젝트의 유일한 관리자라면 해당 프로젝트에서 탈퇴를 할 수 없습니다.
                </>
              }
              index={3}
              isOpen={isQuestionOpen(3)}
              onKeyDown={handleQuestionRowKeyDown}
              onToggle={toggleQuestion}
              question="프로젝트 탈퇴는 어떻게 하나요."
            />
            <HelpFaqRow
              answer={
                <>
                  게시판에서는 다음과 같은 기능이 가능합니다.
                  <ul>
                    <li>게시물 읽기: 사용자는 게시물의 내용을 볼 수 있다.</li>
                    <li>게시물 댓글 등록: 로그인 유저는 게시물에 댓글을 남길 수 있다.</li>
                    <li>게시물 댓글 조회: 사용자는 게시물의 댓글을 볼 수 있다.</li>
                    <li>게시물 댓글 삭제: 로그인 유저는 자신이 남긴 댓글을 삭제할 수 있다.</li>
                    <li>관리자 게시물 댓글 삭제: 프로젝트 관리자는 댓글을 삭제할 수 있다.</li>
                    <li>관리자 게시물 수정: 프로젝트 관리자는 게시물을 편집/삭제 할 수 있다.</li>
                  </ul>
                </>
              }
              index={4}
              isOpen={isQuestionOpen(4)}
              onKeyDown={handleQuestionRowKeyDown}
              onToggle={toggleQuestion}
              question="게시판에서는 어떠한 것들을 할수 있나요?"
            />
            <HelpFaqRow
              answer={
                <>
                  {appName}는 현재 Open Source로 진행되고 있습니다. 버그를 발견하셨다면{" "}
                  <Link
                    href="https://github.com/nforge/yobi/issues"
                    to={externalLinkTo("https://github.com/nforge/yobi/issues")}
                    reloadDocument
                  >
                    {appName} 이슈트래커에 등록
                  </Link>
                  해 주시거나 패치를 만들어 보내주시면 됩니다.
                </>
              }
              index={5}
              isLast
              isOpen={isQuestionOpen(5)}
              onKeyDown={handleQuestionRowKeyDown}
              onToggle={toggleQuestion}
              question={`${appName}의 버그를 발견했어요.`}
            />
          </ul>
        </div>
      </div>
    </>
  );
}

function HelpFaqRow({
  answer,
  index,
  isLast = false,
  isOpen,
  onKeyDown,
  onToggle,
  question,
}: {
  answer: React.ReactNode;
  index: number;
  isLast?: boolean;
  isOpen: boolean;
  onKeyDown: (event: React.KeyboardEvent<HTMLLIElement>, index: number) => void;
  onToggle: (index: number) => void;
  question: React.ReactNode;
}) {
  return (
    <li
      data-index={index}
      data-state={isOpen ? "open" : "closed"}
      data-owner="help-faq-row"
      onClick={() => onToggle(index)}
      onKeyDown={(event) => onKeyDown(event, index)}
    >
      <div data-owner="help-faq-question-wrap">
        <i data-owner="help-faq-question-icon" />
        <span data-owner="help-faq-question">
          <button
            aria-expanded={isOpen}
            data-owner="help-faq-question-control"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(index);
            }}
            type="button"
          >
            {question}
          </button>
        </span>
        <i
          aria-hidden="true"
          data-owner="help-faq-toggle-icon"
          style={{ "--help-faq-sprite": `url(${legacySpriteUrl})` } as React.CSSProperties}
        />
      </div>
      <div data-state={isOpen ? "open" : "closed"} data-owner="help-faq-answer-wrap">
        <i data-owner="help-faq-answer-icon" />
        <div data-owner="help-faq-answer">{answer}</div>
      </div>
    </li>
  );
}
