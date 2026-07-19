import * as React from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { prefixBasePath } from "../runtime-config";
import { globalBreakpoints } from "../theme.stylex";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import { SiteLayoutShell } from "./-home-route-screen";
import { helpColors } from "./-help.stylex";

const faqStyles = stylex.create({
  sprite: (spriteUrl: string) => ({
    "--help-faq-sprite": `url(${spriteUrl})`,
  }),
});

const styles = stylex.create({
  breadcrumbOuter: {
    boxSizing: "border-box",
    minWidth: { [globalBreakpoints.mobile]: "10px" },
    padding: "0px 10px",
    width: "100%",
  },
  breadcrumbInner: {
    margin: "0px auto",
  },
  breadcrumbHeading: {
    lineHeight: "30px",
    padding: "10px 10px 5px",
  },
  pageWrapOuter: {
    boxSizing: "border-box",
    marginTop: "10px",
    minHeight: "450px",
    minWidth: { [globalBreakpoints.mobile]: "10px" },
    padding: { default: "0px 10px", [globalBreakpoints.mobile]: "0px" },
    width: "100%",
  },
  pageWrap: {
    backgroundColor: helpColors.pageSurface,
    margin: "0px auto",
  },
  faqList: {
    listStyle: "none",
    margin: "30px 0px 0px",
    padding: "0px",
  },
  faqRow: {
    borderBottomColor: helpColors.faqBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    marginBottom: "14px",
  },
  faqLastRow: {
    borderBottomStyle: "none",
  },
  faqQuestionWrap: {
    boxSizing: "content-box",
    display: "table",
    lineHeight: 1.2,
    marginBottom: "14px",
    padding: "0px 15px",
    width: "100%",
  },
  faqQuestionWrapOpen: {
    marginBottom: "16px",
  },
  faqIcon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontSize: "2em",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "bold",
    lineHeight: 1,
    textDecoration: "none",
    verticalAlign: "middle",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  faqQuestionIcon: {
    color: helpColors.faqQuestionIcon,
    "::before": { content: '"\\e48f"' },
  },
  faqQuestionControl: {
    backgroundColor: "transparent",
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    color: "inherit",
    display: "block",
    fontFamily: "inherit",
    fontSize: "inherit",
    fontWeight: "inherit",
    height: "100%",
    lineHeight: "inherit",
    padding: "0px",
    textAlign: "inherit",
    width: "100%",
  },
  faqQuestion: {
    boxSizing: "content-box",
    color: helpColors.faqQuestionText,
    display: "table-cell",
    fontSize: "14px",
    lineHeight: 1.2,
    textAlign: "start",
    textDecoration: "none",
    verticalAlign: "middle",
    width: "85%",
  },
  faqToggleIcon: {
    backgroundImage: "var(--help-faq-sprite)",
    backgroundPosition: "-3px -144px",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "14px",
    margin: "17px",
    verticalAlign: "middle",
    width: "14px",
  },
  faqToggleIconOpen: {
    backgroundPosition: "-20px -144px",
  },
  faqAnswerWrap: {
    backgroundColor: helpColors.faqAnswerSurface,
    borderTopColor: helpColors.faqBorder,
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    boxSizing: "content-box",
    display: "none",
    padding: "15px",
  },
  faqAnswerWrapOpen: {
    display: "table",
  },
  faqAnswerIcon: {
    color: helpColors.faqAnswerIcon,
    marginRight: "30px",
    "::before": { content: '"\\e480"' },
  },
  faqAnswer: {
    boxSizing: "content-box",
    display: "table-cell",
    lineHeight: "180%",
    paddingRight: "9%",
    textAlign: "justify",
    verticalAlign: "top",
    width: "100%",
    wordBreak: "break-all",
  },
});

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
      <div
        {...stylex.props(styles.breadcrumbOuter)}
        data-stylex-owner="help-shell-breadcrumb-outer"
      >
        <div
          {...stylex.props(styles.breadcrumbInner)}
          data-stylex-owner="help-shell-breadcrumb-inner"
        >
          <h3
            {...stylex.props(styles.breadcrumbHeading)}
            data-stylex-owner="help-shell-breadcrumb-heading"
          >
            {t("title.help")}
          </h3>
        </div>
      </div>
      <div {...stylex.props(styles.pageWrapOuter)} data-stylex-owner="help-shell-page-wrap-outer">
        <div {...stylex.props(styles.pageWrap)} data-stylex-owner="help-shell-page-wrap">
          <ul {...stylex.props(styles.faqList)} data-stylex-owner="help-faq-list">
            <HelpFaqRow
              answer="공개 저장소가 준비되면 설치 안내를 제공할 예정입니다."
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
                  {appName}는 Open Source로 진행되고 있습니다. 공개 저장소가 준비되면 이슈 트래커를
                  통해 버그를 제보하거나 패치를 보내실 수 있습니다.
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
      {...stylex.props(styles.faqRow, isLast && styles.faqLastRow)}
      data-index={index}
      data-state={isOpen ? "open" : "closed"}
      data-stylex-owner="help-faq-row"
      onClick={() => onToggle(index)}
      onKeyDown={(event) => onKeyDown(event, index)}
    >
      <div
        {...stylex.props(styles.faqQuestionWrap, isOpen && styles.faqQuestionWrapOpen)}
        data-stylex-owner="help-faq-question-wrap"
      >
        <i
          {...stylex.props(styles.faqIcon, styles.faqQuestionIcon)}
          data-stylex-owner="help-faq-question-icon"
        />
        <span {...stylex.props(styles.faqQuestion)} data-stylex-owner="help-faq-question">
          <button
            {...stylex.props(styles.faqQuestionControl)}
            aria-expanded={isOpen}
            data-stylex-owner="help-faq-question-control"
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
          {...stylex.props(
            styles.faqToggleIcon,
            faqStyles.sprite(legacySpriteUrl),
            isOpen && styles.faqToggleIconOpen,
          )}
          aria-hidden="true"
          data-stylex-owner="help-faq-toggle-icon"
        />
      </div>
      <div
        {...stylex.props(styles.faqAnswerWrap, isOpen && styles.faqAnswerWrapOpen)}
        data-state={isOpen ? "open" : "closed"}
        data-stylex-owner="help-faq-answer-wrap"
      >
        <i
          {...stylex.props(styles.faqIcon, styles.faqAnswerIcon)}
          data-stylex-owner="help-faq-answer-icon"
        />
        <div {...stylex.props(styles.faqAnswer)} data-stylex-owner="help-faq-answer">
          {answer}
        </div>
      </div>
    </li>
  );
}
