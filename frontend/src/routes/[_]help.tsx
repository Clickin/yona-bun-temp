import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";

export const Route = createFileRoute("/_help")({
  component: HelpTocRoute,
});

function HelpTocRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <HelpTocScreen />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function HelpTocScreen() {
  const { t } = useLegacyMessages();
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const appName = t("app.name");
  const toggleQuestion = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };
  const handleQuestionKeyDown = (event: React.KeyboardEvent<HTMLLIElement>, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleQuestion(index);
    }
  };

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{t("title.help")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <ul className="qas">
            <li
              className={openIndex === 0 ? "qa open" : "qa"}
              onClick={() => toggleQuestion(0)}
              onKeyDown={(event) => handleQuestionKeyDown(event, 0)}
            >
              <div className="question-wrap">
                <i className="yobicon-q q" />
                <a href="#!/toggle" className="question">
                  {appName}를 설치하고 싶어요.
                </a>
                <i className="ico icor" />
              </div>
              <div className="answer-wrap">
                <i className="yobicon-a a" />
                <Answer>
                  {appName}를 설치하고자 하면{" "}
                  <a href="https://github.com/doortts/yona#korean">
                    https://github.com/doortts/yona#korean
                  </a>
                  를 참고해 주세요.
                </Answer>
              </div>
            </li>
            <li
              className={openIndex === 1 ? "qa open" : "qa"}
              onClick={() => toggleQuestion(1)}
              onKeyDown={(event) => handleQuestionKeyDown(event, 1)}
            >
              <div className="question-wrap">
                <i className="yobicon-q q" />
                <a href="#!/toggle" className="question">
                  프로젝트를 새로 생성하고 싶어요.
                </a>
                <i className="ico icor" />
              </div>
              <div className="answer-wrap">
                <i className="yobicon-a a" />
                <Answer>
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
                </Answer>
              </div>
            </li>
            <li
              className={openIndex === 2 ? "qa open" : "qa"}
              onClick={() => toggleQuestion(2)}
              onKeyDown={(event) => handleQuestionKeyDown(event, 2)}
            >
              <div className="question-wrap">
                <i className="yobicon-q q" />
                <a href="#!/toggle" className="question">
                  내가 참여하는 프로젝트들은 어디서 볼수 있나요?
                </a>
                <i className="ico icor" />
              </div>
              <div className="answer-wrap">
                <i className="yobicon-a a" />
                <Answer>
                  <a href="/">메인화면</a> 우측 하단에 다음과 같이 참여하고 있는 프로젝트의 목록을
                  볼수 있습니다. 자물쇠가 있는 것은 비공개 프로젝트이며 자물쇠가 없는 것은 공개
                  프로젝트 입니다. 혹은 자신의 <a href="/info">정보 페이지</a>에서도 확인하실수
                  있습니다.
                </Answer>
              </div>
            </li>
            <li
              className={openIndex === 3 ? "qa open" : "qa"}
              onClick={() => toggleQuestion(3)}
              onKeyDown={(event) => handleQuestionKeyDown(event, 3)}
            >
              <div className="question-wrap">
                <i className="yobicon-q q" />
                <a href="#!/toggle" className="question">
                  프로젝트 탈퇴는 어떻게 하나요.
                </a>
                <i className="ico icor" />
              </div>
              <div className="answer-wrap">
                <i className="yobicon-a a" />
                <Answer>
                  자신의 <a href="/info">정보 페이지</a>에서 참여하고 있는 프로젝트 목록을 볼 수있고
                  탈퇴도 할수 있습니다. 자신이 프로젝트의 유일한 관리자라면 해당 프로젝트에서 탈퇴를
                  할 수 없습니다.
                </Answer>
              </div>
            </li>
            <li
              className={openIndex === 4 ? "qa open" : "qa"}
              onClick={() => toggleQuestion(4)}
              onKeyDown={(event) => handleQuestionKeyDown(event, 4)}
            >
              <div className="question-wrap">
                <i className="yobicon-q q" />
                <a href="#!/toggle" className="question">
                  게시판에서는 어떠한 것들을 할수 있나요?
                </a>
                <i className="ico icor" />
              </div>
              <div className="answer-wrap">
                <i className="yobicon-a a" />
                <Answer>
                  게시판에서는 다음과 같은 기능이 가능합니다.
                  <ul>
                    <li>게시물 읽기: 사용자는 게시물의 내용을 볼 수 있다.</li>
                    <li>게시물 댓글 등록: 로그인 유저는 게시물에 댓글을 남길 수 있다.</li>
                    <li>게시물 댓글 조회: 사용자는 게시물의 댓글을 볼 수 있다.</li>
                    <li>게시물 댓글 삭제: 로그인 유저는 자신이 남긴 댓글을 삭제할 수 있다.</li>
                    <li>관리자 게시물 댓글 삭제: 프로젝트 관리자는 댓글을 삭제할 수 있다.</li>
                    <li>관리자 게시물 수정: 프로젝트 관리자는 게시물을 편집/삭제 할 수 있다.</li>
                  </ul>
                </Answer>
              </div>
            </li>
            <li
              className={openIndex === 5 ? "qa open" : "qa"}
              onClick={() => toggleQuestion(5)}
              onKeyDown={(event) => handleQuestionKeyDown(event, 5)}
            >
              <div className="question-wrap">
                <i className="yobicon-q q" />
                <a href="#!/toggle" className="question">
                  {appName}의 버그를 발견했어요.
                </a>
                <i className="ico icor" />
              </div>
              <div className="answer-wrap">
                <i className="yobicon-a a" />
                <Answer>
                  {appName}는 현재 Open Source로 진행되고 있습니다. 버그를 발견하셨다면{" "}
                  <a href="https://github.com/nforge/yobi/issues">
                    {`${appName} 이슈트래커에 등록`}
                  </a>
                  해 주시거나 패치를 만들어 보내주시면 됩니다.
                </Answer>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}

function Answer({ children }: React.PropsWithChildren) {
  return (
    <div className="answer" ref={setLegacyAnswerStyle}>
      {children}
    </div>
  );
}

function setLegacyAnswerStyle(element: HTMLDivElement | null) {
  element?.setAttribute("style", "width:100%");
}
