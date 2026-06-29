import * as React from "react";
import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  useLegacyMessages,
  type LegacyI18nContextValue,
} from "../i18n";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

function legacyMessage(messages: LegacyMessageLookup | undefined, key: string) {
  return messages
    ? messages(key, { fallback: key })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key);
}

export function HelpTocPage({
  messages,
  siteName = "Yona",
}: { messages?: LegacyMessageLookup; siteName?: string } = {}) {
  const runtimeMessages = useLegacyMessages().t;
  const messageLookup = messages ?? runtimeMessages;
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const [openItems, setOpenItems] = React.useState<Set<number>>(() => new Set());

  function toggleItem(index: number) {
    setOpenItems((previous) => {
      const next = new Set(previous);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  React.useEffect(() => {
    const list = listRef.current;
    if (!list) {
      return undefined;
    }
    const items = Array.from(list.querySelectorAll<HTMLLIElement>(":scope > .qa"));
    const cleanups = items.map((item, index) => {
      const listener = () => toggleItem(index);
      item.addEventListener("click", listener);
      return () => item.removeEventListener("click", listener);
    });
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return (
    <>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>{legacyMessage(messageLookup, "title.help")}</h3>
        </div>
      </div>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <ul className="qas" ref={listRef}>
            {helpQuestions.map((item, index) => {
              const question = item.question(siteName);
              return (
                <li className={`qa${openItems.has(index) ? " open" : ""}`} key={question}>
                  <div className="question-wrap">
                    <i className="yobicon-q q"></i>
                    <a className="question" href="#!/toggle">
                      {question}
                    </a>
                    <i className="ico icor"></i>
                  </div>
                  <div className="answer-wrap">
                    <i className="yobicon-a a"></i>
                    <div className="answer" style={{ width: "100%" }}>
                      {item.answer(siteName)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <LegacyExperimentalHelp messages={messageLookup} />
    </>
  );
}

export function LegacyExperimentalHelp({ messages }: { messages?: LegacyMessageLookup } = {}) {
  const [descriptionBeforeBreak, descriptionAfterBreak] = legacyMessage(
    messages,
    "common.experimental.description",
  ).split("<br>");

  return (
    <div className="modal hide fade" id="experimentalHelp" role="dialog" tabIndex={-1}>
      <div className="modal-body">
        <div>
          <h4 className="center-txt">
            <i className="yobicon-flaskfull mr10 vmiddle"></i>
            {legacyMessage(messages, "common.experimental.title")}
          </h4>
          <p className="modal-body center-txt">
            {descriptionBeforeBreak}
            {descriptionAfterBreak ? (
              <>
                <br />
                {descriptionAfterBreak}
              </>
            ) : null}
          </p>
        </div>
        <p className="actrow center-txt">
          <button className="ybtn ybtn-info" data-dismiss="modal" type="button">
            {legacyMessage(messages, "button.confirm")}
          </button>
        </p>
      </div>
    </div>
  );
}

const helpQuestions: Array<{
  question: (siteName: string) => string;
  answer: (siteName: string) => React.ReactNode;
}> = [
  {
    answer: (siteName) => (
      <>
        {`${siteName}를 설치하고자 하면 `}
        <a href="https://github.com/doortts/yona#korean">https://github.com/doortts/yona#korean</a>
        를 참고해 주세요.
      </>
    ),
    question: (siteName) => `${siteName}를 설치하고 싶어요.`,
  },
  {
    answer: () => (
      <>
        <p>상단의 "새 프로젝트 시작"을 클릭하신후 필요한 정보를 입력하시면 됩니다.</p>
        <p>
          공개설정에서 공개를 택하게 되면 해당 프로젝트의 멤버가 아닌 사용자들도 해당 프로젝트를
          둘러 볼 수 있게 되며 멤버가 아니라면 코드 저장소를 익명으로 접근하여 소스코드를 받아 갈
          수는 있지만 소스코드를 수정하지는 못합니다. 공개설정에서 비공개를 선택하면 해당 프로젝트의
          멤버가 아닌 사용자들은 단지 설명과 이름만을 볼수 있습니다.
        </p>
        <p>
          코드 저장소 방식은 현재 Git과 Subversion을 지원합니다. Subversion과 Git은 전 세계적으로
          널리 쓰이고 있으며 충분한 신뢰성과 성능을 가지고 있습니다.
        </p>
        <p>
          위의 내용을 다 작성하셨다면 "프로젝트 생성" 버튼을 누르면 새로운 프로젝트를 생성하실수
          있습니다.
        </p>
      </>
    ),
    question: () => "프로젝트를 새로 생성하고 싶어요.",
  },
  {
    answer: () => (
      <>
        <a href="/">메인화면</a>
        우측 하단에 다음과 같이 참여하고 있는 프로젝트의 목록을 볼수 있습니다. 자물쇠가 있는 것은
        비공개 프로젝트이며 자물쇠가 없는 것은 공개 프로젝트 입니다. 혹은 자신의{" "}
        <a href="/info">정보 페이지</a>에서도 확인하실수 있습니다.
      </>
    ),
    question: () => "내가 참여하는 프로젝트들은 어디서 볼수 있나요?",
  },
  {
    answer: () => (
      <>
        자신의 <a href="/info">정보 페이지</a>에서 참여하고 있는 프로젝트 목록을 볼 수있고 탈퇴도
        할수 있습니다. 자신이 프로젝트의 유일한 관리자라면 해당 프로젝트에서 탈퇴를 할 수 없습니다.
      </>
    ),
    question: () => "프로젝트 탈퇴는 어떻게 하나요.",
  },
  {
    answer: () => (
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
    ),
    question: () => "게시판에서는 어떠한 것들을 할수 있나요?",
  },
  {
    answer: (siteName) => (
      <>
        {`${siteName}는 현재 Open Source로 진행되고 있습니다. 버그를 발견하셨다면 `}
        <a href="https://github.com/nforge/yobi/issues">{siteName} 이슈트래커에 등록</a>해 주시거나
        패치를 만들어 보내주시면 됩니다.
      </>
    ),
    question: (siteName) => `${siteName}의 버그를 발견했어요.`,
  },
];
