import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import defaultAvatarUrl from "../assets/legacy/default-avatar-128.png";
import { prefixBasePath } from "../runtime-config";
export const Route = createFileRoute("/_UIKit")({
  component: UIKitRoute,
});

const Xmp = "xmp" as unknown as React.ComponentType<React.HTMLAttributes<HTMLElement>>;

function UIKitRoute() {
  const [showsViaEmailDemo, setShowsViaEmailDemo] = React.useState(false);

  return (
    <>
      <title>Yobi UI</title>
      <style>{`body { color:#ccc; }
      dl { display:inline-block; margin:18px; }
      dd { margin-left:0; }
      .gnb-logo { display:inline-block !important; }
      .gnb-outer { text-align:center; }
      .subtitle { font-size:24px; font-weight:bold; height:55px; line-height:55px; vertical-align:bottom; }
      .css { font-family: Consolas; color: #222; background: #C9EBB5; padding: 3px; border-radius: 3px; border: 1px solid #4CB848; }
      .page-wrap { width:940px; max-width:none; }
      .page-footer-outer { padding:10px; }
      .nav-tabs > li > button {
        appearance:none; background:transparent; border:1px solid transparent;
        box-sizing:border-box; color:#3592b5; display:block; font:inherit;
        font-weight:700; line-height:20px; padding:8px 30px;
      }
      .nav-tabs > li.active > button { background:#fff; color:#555; }
      .nav-tabs > li { width:86.5px; }
      button.avatar-wrap { appearance:none; border:0; }
      body:has(.page-wrap-outer) > #root,
      body:has(.page-wrap-outer) > #root > #main,
      body:has(.page-wrap-outer) > #root > #main > [data-root-boundary] { display:contents; }
      .has-switch input[data-toggle="switch"] {
        display:block; opacity:0; position:absolute; left:0; top:0;
        width:80px; height:29px; margin:0; z-index:101;
      }
      .has-switch > .switch-animate.switch-off input[data-toggle="switch"] { left:63%; }
      `}</style>
      <UIKitPageHeader />
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <UIKitButtonsSection />
            <UIKitSelectSection />
            <UIKitSearchFormSection />
            <UIKitLabelsSection />
            <UIKitAvatarSection />
            <UIKitTabsSection />
            <UIKitSwitchesSection
              showsViaEmailDemo={showsViaEmailDemo}
              onToggleViaEmailDemo={setShowsViaEmailDemo}
            />
          </div>
        </div>
      </div>
      <UIKitPageFooter />
    </>
  );
}

function UIKitPageHeader() {
  return (
    <header className="gnb-outer">
      <span className="subtitle">Yobi UI</span>
    </header>
  );
}

function UIKitButtonsSection() {
  return (
    <>
      <h3>Buttons</h3>
      <div>
        <pre>.ybtn</pre>
        <p>
          <button type="button" className="ybtn">
            Default
          </button>{" "}
          <button type="button" className="ybtn ybtn-primary">
            Primary
          </button>{" "}
          <button type="button" className="ybtn ybtn-inverse">
            Inverse
          </button>{" "}
          <button type="button" className="ybtn ybtn-info">
            Info
          </button>{" "}
          <button type="button" className="ybtn ybtn-watching">
            Watching
          </button>{" "}
          <button type="button" className="ybtn ybtn-warning">
            Warning
          </button>{" "}
          <button type="button" className="ybtn ybtn-danger">
            Danger
          </button>{" "}
          <button type="button" className="ybtn ybtn-disabled">
            Disabled
          </button>
        </p>
        <CodeSample>{`
${legacyAnchorMarkup('href="#" class="ybtn"', "Default")}
      <button type="button" class="ybtn ybtn-primary">Primary</button>
      ${legacyAnchorMarkup('href="#" class="ybtn ybtn-inverse"', "Inverse")}
      <button type="button" class="ybtn ybtn-info">Info</button>
      ${legacyAnchorMarkup('href="#" class="ybtn ybtn-watching"', "Watching")}
      <button type="button" class="ybtn ybtn-warning">Warning</button>
      ${legacyAnchorMarkup('href="#" class="ybtn ybtn-danger"', "Danger")}
 `}</CodeSample>
        <hr />
        <div className="btn-wrap">
          <div className="nbtn medium white fake-file-wrap">
            <i className="ico ico-plus-blue" />
            Upload
            <input type="file" className="file" name="filePath" accept="image/*" />
          </div>
        </div>
        <CodeSample>{`<div class="btn-wrap">
          <div class="nbtn medium white fake-file-wrap">
              <i class="ico ico-plus-blue"></i>Upload
              <input type="file" class="file" name="filePath" accept="image/*">
          </div>
      </div>
 `}</CodeSample>
      </div>
      <hr />
    </>
  );
}
function UIKitSelectSection() {
  return (
    <>
      <h3>Select</h3>
      <div>
        <pre>.dropdown-toggle</pre>
        <DropdownDemo size="small" />
        <DropdownDemo size="medium" />
        <DropdownDemo size="large" />
        <CodeSample>{`<div class="btn-group" data-name="assigneeId">
          <button class="btn dropdown-toggle large" data-toggle="dropdown">
              <span class="d-label">전체</span>
              <span class="d-caret"><span class="caret"></span></span>
          </button>
          <ul class="dropdown-menu">
              <li data-value="" data-selected="true" class="active">${legacyAnchorMarkup('href="javascript:void(0)"', "전체")}</li>
              <li data-value="0">${legacyAnchorMarkup('href="javascript:void(0)"', "담당자 없음")}</li>
          </ul>
      </div>
 `}</CodeSample>
      </div>
      <hr />
    </>
  );
}
function UIKitSearchFormSection() {
  return (
    <>
      <h3>Search Form</h3>
      <div>
        <pre>.form-search</pre>
        <form className="form-search">
          <input type="text" className="text" name="filter" placeholder="현재 프로젝트에서 검색" />
          <button type="button" className="btn">
            검색
          </button>
        </form>
        <CodeSample>{`<form class="form-search">
          <input type="text" class="text" name="filter" placeholder="현재 프로젝트에서 검색"><!--
       --><button type="button" class="btn">검색</button>
      </form>`}</CodeSample>
        <hr />
        <pre>.search-bar</pre>
        <div className="search">
          <div className="search-bar">
            <input name="filter" className="textbox full" type="text" />
            <button type="submit" className="search-btn">
              <i className="yobicon-search" />
            </button>
          </div>
        </div>
        <CodeSample>{`<div class="search">
          <div class="search-bar">
              <input name="filter" class="textbox full" type="text">
              <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
          </div>
      </div>
 `}</CodeSample>
      </div>
      <hr />
    </>
  );
}
function UIKitLabelsSection() {
  return (
    <>
      <h3>Labels</h3>
      <div>
        <pre>.issue-label</pre>
        <p>
          <button className="issue-label">Clean</button>{" "}
          <button className="issue-label">Fresh</button>{" "}
          <button className="issue-label">Modern</button>{" "}
          <button className="issue-label">Unique</button>
        </p>
        <pre>.issue-label .active</pre>
        <p>
          <IssueLabel color="#da5454">Clean</IssueLabel>{" "}
          <IssueLabel color="#ff9933">Fresh</IssueLabel>{" "}
          <IssueLabel color="#ffcc33">Modern</IssueLabel>{" "}
          <IssueLabel color="#22b4b9">Unique</IssueLabel>
        </p>
        <pre>.issue-label .active .editable</pre>
        <p>
          <IssueLabel color="#da5454" editable>
            Clean
          </IssueLabel>{" "}
          <IssueLabel color="#ff9933" editable>
            Fresh
          </IssueLabel>{" "}
          <IssueLabel color="#ffcc33" editable>
            Modern
          </IssueLabel>{" "}
          <IssueLabel color="#22b4b9" editable>
            Unique
          </IssueLabel>
        </p>
      </div>
      <CodeSample>{`<button class="issue-label">Clean</button>
      <button class="issue-label active" style="background-color:#da5454; color:#fff;">Clean<span class="delete">&times;</span></button>
      <button class="issue-label active editable" style="background-color:#da5454; color:#fff;">Clean<span class="delete">&times;</span></button>`}</CodeSample>
      <hr />
    </>
  );
}
function UIKitAvatarSection() {
  return (
    <>
      <h3>Avatar</h3>
      <div>
        <pre>.avatar-wrap</pre>
        <AvatarDemo size="mini" label=".mini (12x12)" />
        <AvatarDemo size="smaller" label=".smaller (20x20)" />
        <AvatarDemo size="small" label=".small (24x24)" />
        <AvatarDemo size="medium" label=".medium (32x32, default)" />
        <AvatarDemo size="mlarge" label=".mlarge (40x40)" />
        <AvatarDemo size="large" label=".large (64x64)" />
        <AvatarDemo size="xlarge" label=".xlarge (128x128)" />
      </div>
      <hr />
    </>
  );
}
function UIKitTabsSection() {
  return (
    <>
      <h3>Tabs</h3>
      <pre>.nav .nav-tabs</pre>
      <div>
        <ul className="nav nav-tabs">
          <li className="active">
            <button type="button">파일</button>
          </li>
          <li>
            <button type="button">커밋</button>
          </li>
        </ul>
      </div>
      <hr />
    </>
  );
}
function UIKitSwitchesSection({
  showsViaEmailDemo,
  onToggleViaEmailDemo,
}: {
  showsViaEmailDemo: boolean;
  onToggleViaEmailDemo: (checked: boolean) => void;
}) {
  return (
    <>
      <h3>Switches</h3>
      <CodeSample>{`<input type="checkbox" data-toggle="switch">`}</CodeSample>
      <div>
        <UIKitSwitch initialChecked />{" "}
        <UIKitSwitch deactivate checked={showsViaEmailDemo} onChange={onToggleViaEmailDemo} />{" "}
        <UIKitSwitch square />
      </div>
      {showsViaEmailDemo ? <OriginalMessageDemo /> : null}
    </>
  );
}

function UIKitSwitch({
  checked,
  deactivate = false,
  initialChecked = false,
  onChange,
  square = false,
}: {
  checked?: boolean;
  deactivate?: boolean;
  initialChecked?: boolean;
  onChange?: (checked: boolean) => void;
  square?: boolean;
}) {
  const [internalChecked, setInternalChecked] = React.useState(initialChecked);
  const inputId = React.useId();
  const isChecked = checked ?? internalChecked;
  const updateSwitchState = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextChecked = event.currentTarget.checked;
    if (checked === undefined) {
      setInternalChecked(nextChecked);
    }
    onChange?.(nextChecked);
  };

  return (
    <div
      className={`switch${deactivate ? " deactivate" : ""}${square ? " switch-square" : ""} has-switch`}
      data-on-label={square ? "<i class='yobicon-eye-close'></i>" : "미해결"}
      data-off-label={square ? "<i class='yobicon-eye-open'></i>" : "해결"}
    >
      <div className={`switch-animate switch-${isChecked ? "on" : "off"}`}>
        <input
          type="checkbox"
          data-toggle="switch"
          checked={isChecked}
          id={inputId}
          onChange={updateSwitchState}
        />
        <span className="switch-left">
          {square ? <i className="yobicon-eye-close" /> : "미해결"}
        </span>
        <label htmlFor={inputId}>&nbsp;</label>
        <span className="switch-right">{square ? <i className="yobicon-eye-open" /> : "해결"}</span>
      </div>
    </div>
  );
}

function UIKitPageFooter() {
  return (
    <footer className="page-footer-outer">
      <div className="page-footer">
        <span className="provider">
          © <strong>NAVER Corp.</strong>
        </span>
      </div>
    </footer>
  );
}

function OriginalMessageDemo() {
  const [showsOriginalMessage, setShowsOriginalMessage] = React.useState(false);

  return (
    <>
      <hr />
      <div
        id="ui-kit-via-email-fixture"
        className="markdown-wrap"
        data-via-email="true"
        data-original-message-owner="route"
      >
        <p>Reply body</p>
        <blockquote>
          <button
            type="button"
            data-owner="uikit-original-message-toggle"
            onClick={() => {
              setShowsOriginalMessage((current) => !current);
            }}
          >
            ...
          </button>
          <p id="via-email-delimiter" hidden={!showsOriginalMessage}>
            --- Original Message ---
          </p>
          <p id="via-email-hidden-line" hidden={!showsOriginalMessage}>
            Hidden original line
          </p>
        </blockquote>
        <p id="via-email-hidden-sibling" hidden={!showsOriginalMessage}>
          Hidden sibling after blockquote
        </p>
      </div>
    </>
  );
}

function DropdownDemo({ size }: { size: "small" | "medium" | "large" }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState("");
  const [hasSelectedValue, setHasSelectedValue] = React.useState(false);
  const selectedLabel = selectedValue === "0" ? "담당자 없음" : "전체";

  return (
    <dl>
      <dt>
        <span className="css">.{size}</span>
      </dt>
      <dd>
        <div className={`btn-group${isOpen ? " open" : ""}`} data-name="assigneeId">
          <button
            className={`btn dropdown-toggle ${size}`}
            data-toggle="dropdown"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsOpen((current) => !current);
            }}
          >
            <span className="d-label">{selectedLabel}</span>
            <span className="d-caret">
              <span className="caret" />
            </span>
          </button>
          <ul className="dropdown-menu">
            <li
              data-value=""
              data-selected="true"
              className={selectedValue === "" ? "active" : undefined}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedValue("");
                setHasSelectedValue(true);
                setIsOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedValue("");
                  setHasSelectedValue(true);
                  setIsOpen(false);
                }
              }}
              aria-selected={selectedValue === ""}
              role="option"
              tabIndex={-1}
            >
              <button type="button">전체</button>
            </li>
            <li
              data-value="0"
              className={selectedValue === "0" ? "active" : undefined}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedValue("0");
                setHasSelectedValue(true);
                setIsOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelectedValue("0");
                  setHasSelectedValue(true);
                  setIsOpen(false);
                }
              }}
              aria-selected={selectedValue === "0"}
              role="option"
              tabIndex={-1}
            >
              <button type="button">담당자 없음</button>
            </li>
          </ul>
          {hasSelectedValue ? (
            <input type="hidden" name="assigneeId" value={selectedValue} />
          ) : null}
        </div>
      </dd>
    </dl>
  );
}

function IssueLabel({
  children,
  color,
  editable = false,
}: {
  children: string;
  color: string;
  editable?: boolean;
}) {
  return (
    <button
      style={{ backgroundColor: color, color: "#fff" }}
      className={`issue-label active${editable ? " editable" : ""}`}
      data-owner="uikit-issue-label"
    >
      {children}
      <span className="delete">&times;</span>
    </button>
  );
}

function AvatarDemo({ label, size }: { label: string; size: string }) {
  const { runtimeConfig } = Route.useRouteContext();
  return (
    <dl>
      <dt>
        <span className="css">{label}</span>
      </dt>
      <dd>
        <button type="button" className={`avatar-wrap ${size}`}>
          <img src={prefixBasePath(runtimeConfig.basePath, defaultAvatarUrl)} alt="" />
        </button>
      </dd>
    </dl>
  );
}

function CodeSample({ children }: { children: string }) {
  return <Xmp className="css">{children}</Xmp>;
}

function legacyAnchorMarkup(attributes: string, text: string) {
  return `<${"a"} ${attributes}>${text}</${"a"}>`;
}
