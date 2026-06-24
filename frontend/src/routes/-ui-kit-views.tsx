import * as React from "react";
import type { RuntimeConfig } from "../runtime-config";
import { prefixBasePath } from "../runtime-config";

const avatarSizes = [
  [".mini (12x12)", "mini"],
  [".smaller (20x20)", "smaller"],
  [".small (24x24)", "small"],
  [".medium (32x32, default)", "medium"],
  [".mlarge (40x40)", "mlarge"],
  [".large (64x64)", "large"],
  [".xlarge (128x128)", "xlarge"],
] as const;

const labelColors = ["#da5454", "#ff9933", "#ffcc33", "#22b4b9"] as const;
const labelNames = ["Clean", "Fresh", "Modern", "Unique"] as const;

export function UIKitPage({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const uiKitHref = prefixBasePath(runtimeConfig.basePath, "/ui-kit");
  const defaultAvatarUrl = prefixBasePath(
    runtimeConfig.basePath,
    "/assets/images/default-avatar-128.png",
  );

  return (
    <>
      <style>{uiKitInlineStyle}</style>
      <header className="gnb-outer">
        <span className="subtitle">Yobi UI</span>
      </header>
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <h3>Buttons</h3>
            <div>
              <pre>.ybtn</pre>
              <p>
                <a href={uiKitHref} className="ybtn">
                  Default
                </a>
                <button type="button" className="ybtn ybtn-primary">
                  Primary
                </button>
                <a href={uiKitHref} className="ybtn ybtn-inverse">
                  Inverse
                </a>
                <button type="button" className="ybtn ybtn-info">
                  Info
                </button>
                <a href={uiKitHref} className="ybtn ybtn-watching">
                  Watching
                </a>
                <button type="button" className="ybtn ybtn-warning">
                  Warning
                </button>
                <a href={uiKitHref} className="ybtn ybtn-danger">
                  Danger
                </a>
                <button type="button" className="ybtn ybtn-disabled">
                  Disabled
                </button>
              </p>
              <Xmp>{buttonExample}</Xmp>
              <hr />
              <div className="btn-wrap">
                <div className="nbtn medium white fake-file-wrap">
                  <i className="ico ico-plus-blue"></i>Upload
                  <input type="file" className="file" name="filePath" accept="image/*" />
                </div>
              </div>
              <Xmp>{uploadExample}</Xmp>
            </div>
            <hr />

            <h3>Select</h3>
            <div>
              <pre>.dropdown-toggle</pre>
              <DropdownSample size="small" uiKitHref={uiKitHref} />
              <DropdownSample size="medium" uiKitHref={uiKitHref} />
              <DropdownSample size="large" uiKitHref={uiKitHref} />
              <Xmp>{dropdownExample}</Xmp>
            </div>
            <hr />

            <h3>Search Form</h3>
            <div>
              <pre>.form-search</pre>
              <form className="form-search">
                <input
                  type="text"
                  className="text"
                  name="filter"
                  placeholder="현재 프로젝트에서 검색"
                />
                <button type="button" className="btn">
                  검색
                </button>
              </form>
              <Xmp>{formSearchExample}</Xmp>
              <hr />
              <pre>.search-bar</pre>
              <div className="search">
                <div className="search-bar">
                  <input name="filter" className="textbox full" type="text" />
                  <button type="submit" className="search-btn">
                    <i className="yobicon-search"></i>
                  </button>
                </div>
              </div>
              <Xmp>{searchBarExample}</Xmp>
            </div>
            <hr />

            <h3>Labels</h3>
            <div>
              <pre>.issue-label</pre>
              <p>
                {labelNames.map((name) => (
                  <button className="issue-label" key={name}>
                    {name}
                  </button>
                ))}
              </p>
              <pre>.issue-label .active</pre>
              <p>
                {labelNames.map((name, index) => (
                  <button
                    className="issue-label active"
                    key={name}
                    style={{ backgroundColor: labelColors[index], color: "#fff" }}
                  >
                    {name}
                    <span className="delete">&times;</span>
                  </button>
                ))}
              </p>
              <pre>.issue-label .active .editable</pre>
              <p>
                {labelNames.map((name, index) => (
                  <button
                    className="issue-label active editable"
                    key={name}
                    style={{ backgroundColor: labelColors[index], color: "#fff" }}
                  >
                    {name}
                    <span className="delete">&times;</span>
                  </button>
                ))}
              </p>
            </div>
            <Xmp>{labelExample}</Xmp>
            <hr />

            <h3>Avatar</h3>
            <div>
              <pre>.avatar-wrap</pre>
              {avatarSizes.map(([label, size]) => (
                <dl key={size}>
                  <dt>
                    <span className="css">{label}</span>
                  </dt>
                  <dd>
                    <a href={uiKitHref} className={`avatar-wrap ${size}`}>
                      <img alt="" src={defaultAvatarUrl} />
                    </a>
                  </dd>
                </dl>
              ))}
            </div>
            <hr />

            <h3>Tabs</h3>
            <pre>.nav .nav-tabs</pre>
            <div>
              <ul className="nav nav-tabs">
                <li className="active">
                  <a href={`${uiKitHref}?tab=files`}>파일</a>
                </li>
                <li>
                  <a href={`${uiKitHref}?tab=commits`}>커밋</a>
                </li>
              </ul>
            </div>

            <hr />
            <h3>Switches</h3>
            <Xmp>{switchExample}</Xmp>
            <div>
              <div className="switch" data-on-label="미해결" data-off-label="해결">
                <input type="checkbox" data-toggle="switch" defaultChecked />
              </div>
              <div className="switch deactivate" data-on-label="미해결" data-off-label="해결">
                <input type="checkbox" data-toggle="switch" />
              </div>
              <div
                className="switch switch-square"
                data-on-label="<i class='yobicon-eye-close'></i>"
                data-off-label="<i class='yobicon-eye-open'></i>"
              >
                <input type="checkbox" data-toggle="switch" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            &copy; <strong>NAVER Corp.</strong>
          </span>
        </div>
      </footer>
    </>
  );
}

function DropdownSample({
  size,
  uiKitHref,
}: {
  size: "small" | "medium" | "large";
  uiKitHref: string;
}) {
  return (
    <dl>
      <dt>
        <span className="css">.{size}</span>
      </dt>
      <dd>
        <div className="btn-group" data-name="assigneeId">
          <button className={`btn dropdown-toggle ${size}`} data-toggle="dropdown">
            <span className="d-label">전체</span>
            <span className="d-caret">
              <span className="caret"></span>
            </span>
          </button>
          <ul className="dropdown-menu">
            <li data-value="" data-selected="true" className="active">
              <a href={`${uiKitHref}?assignee=all`}>전체</a>
            </li>
            <li data-value="0">
              <a href={`${uiKitHref}?assignee=none`}>담당자 없음</a>
            </li>
          </ul>
        </div>
      </dd>
    </dl>
  );
}

function Xmp({ children }: { children: string }) {
  return React.createElement("xmp", { className: "css" }, children);
}

const uiKitInlineStyle = [
  "body { color:#ccc; }",
  "dl { display:inline-block; margin:18px; }",
  "dd { margin-left:0; }",
  ".gnb-logo { display:inline-block !important; }",
  ".gnb-outer { text-align:center; }",
  ".subtitle { font-size:24px; font-weight:bold; height:55px; line-height:55px; vertical-align:bottom; }",
  ".css { font-family: Consolas; color: #222; background: #C9EBB5; padding: 3px; border-radius: 3px; border: 1px solid #4CB848; }",
].join("\n");

const buttonExample = `
        <a href="#" class="ybtn">Default</a>
        <button type="button" class="ybtn ybtn-primary">Primary</button>
        <a href="#" class="ybtn ybtn-inverse">Inverse</a>
        <button type="button" class="ybtn ybtn-info">Info</button>
        <a href="#" class="ybtn ybtn-watching">Watching</a>
        <button type="button" class="ybtn ybtn-warning">Warning</button>
        <a href="#" class="ybtn ybtn-danger">Danger</a>
    `;

const uploadExample = `<div class="btn-wrap">
        <div class="nbtn medium white fake-file-wrap">
            <i class="ico ico-plus-blue"></i>Upload
            <input type="file" class="file" name="filePath" accept="image/*">
        </div>
    </div>
    `;

const dropdownExample = `<div class="btn-group" data-name="assigneeId">
    	<button class="btn dropdown-toggle large" data-toggle="dropdown">
    	    <span class="d-label">전체</span>
    	    <span class="d-caret"><span class="caret"></span></span>
    	</button>
    	<ul class="dropdown-menu">
    	    <li data-value="" data-selected="true" class="active"><a href="javascript:void(0)">전체</a></li>
    	    <li data-value="0"><a href="javascript:void(0)">담당자 없음</a></li>
    	</ul>
    </div>
    `;

const formSearchExample = `<form class="form-search">
        <input type="text" class="text" name="filter" placeholder="현재 프로젝트에서 검색"><!--
     --><button type="button" class="btn">검색</button>
    </form>`;

const searchBarExample = `<div class="search">
                    <div class="search-bar">
                        <input name="filter" class="textbox full" type="text">
                        <button type="submit" class="search-btn"><i class="yobicon-search"></i></button>
                    </div>
                </div>
                `;

const labelExample = `<button class="issue-label">Clean</button>
    <button class="issue-label active" style="background-color:#da5454; color:#fff;">Clean<span class="delete">&times;</span></button>
    <button class="issue-label active editable" style="background-color:#da5454; color:#fff;">Clean<span class="delete">&times;</span></button>`;

const switchExample = `<input type="checkbox" data-toggle="switch">`;
