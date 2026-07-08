/* oxlint-disable jsx-a11y/click-events-have-key-events -- legacy help/markdown.scala.html renders clickable help tabs as li.help-nav. */
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const MARKDOWN_HELP_TARGETS = [
  "markdownHeaders",
  "markdownStyling",
  "markdownLinks",
  "markdownLists",
  "markdownTaskList",
  "markdownImages",
  "markdownBlockquotes",
  "markdownCodes",
  "markdownTables",
  "markdownShortLinks",
] as const;

type MarkdownHelpTarget = (typeof MARKDOWN_HELP_TARGETS)[number];

const MARKDOWN_HEADER_SAMPLE = `
# This is an H1
## This is an H2
### This is an H3
`;

const MARKDOWN_STYLING_SAMPLE = `
*This is an italic*
**This is an bold**
~~This is an strike~~
`;

const MARKDOWN_LINK_SAMPLE = `
[Site](http://yobi.io/ "Yobi Site")

http://yobi.io/
`;

const MARKDOWN_LINK_OUTPUT_SAMPLE = `

[Site](http://yobi.io/ "Yobi Site")

http://yobi.io/
`;

const MARKDOWN_LIST_INPUT_SAMPLE = `
- Red
    1. White
    2. Blue
- Green.
`;

const MARKDOWN_LIST_OUTPUT_SAMPLE = `
- Red
    1. White
    2. Blue
- Green
`;

const MARKDOWN_TASK_LIST_SAMPLE = `
- [ ] Todos
    - [x] To do A
    - [ ] To do B
    - [ ] To do C
`;

const MARKDOWN_IMAGE_INPUT_SAMPLE = `
![title](https://repo.yona.io/assets/images/ico-like-small.png "Yobi")
`;

const MARKDOWN_IMAGE_OUTPUT_SAMPLE = `
![title](/assets/images/ico-like-small.png "Yobi")
`;

const MARKDOWN_BLOCKQUOTE_SAMPLE = `
> Lorem ipsum dolor sit amet, consectetuer adipiscing elit.
>
> Aenean commodo ligula eget dolor.
`;

const MARKDOWN_CODE_SAMPLE = `
\`function test() {console.log("hello world");}\`

\`\`\`javascript
function test() {
  console.log("hello world");
}
\`\`\`
`;

const MARKDOWN_TABLE_INPUT_SAMPLE = `
| Default      | Align center | Align right |
| ------------ | :----------: | ------: |
| Carrot       | Red          | 1,000   |
| Banana       | Yellow       | 32,000  |
`;

const MARKDOWN_TABLE_OUTPUT_SAMPLE = `
| Default      | Align center | Align right |
| ------------ | :----------: | ------: |
| Carrot       | Red          | 1,000   |
| Banana       | Yellow       | 32,000  |

Also, you can copy & paste table from excel sheet
`;

const MARKDOWN_SHORT_LINK_SAMPLE = `
Issue no: #2
Mention: @yobi
commit: @763575 or @763575f177a4ce8b9370954de3ea1a1410205593
`;

function MarkdownSampleOutput({ sample }: { sample: string }) {
  return (
    <div className="markdown-wrap" {...{ markdown: "true" }}>
      {sample}
    </div>
  );
}

export function LegacyMarkdownHelp() {
  const [activeTarget, setActiveTarget] = useState<MarkdownHelpTarget | null>(null);

  const activeClass = (target: MarkdownHelpTarget) => (activeTarget === target ? " active" : "");
  const toggleActiveTarget = (target: MarkdownHelpTarget) => {
    setActiveTarget((current) => (current === target ? null : target));
  };

  return (
    <div className="markdown-help">
      <ul className="markdown-help-nav">
        <li>
          <span className="label">Markdown help</span>
        </li>
        <li
          className={`help-nav${activeClass("markdownHeaders")}`}
          data-target="markdownHeaders"
          onClick={() => toggleActiveTarget("markdownHeaders")}
        >
          Header
        </li>
        <li
          className={`help-nav${activeClass("markdownStyling")}`}
          data-target="markdownStyling"
          onClick={() => toggleActiveTarget("markdownStyling")}
        >
          Text Style
        </li>
        <li
          className={`help-nav${activeClass("markdownLinks")}`}
          data-target="markdownLinks"
          onClick={() => toggleActiveTarget("markdownLinks")}
        >
          Link
        </li>
        <li
          className={`help-nav${activeClass("markdownLists")}`}
          data-target="markdownLists"
          onClick={() => toggleActiveTarget("markdownLists")}
        >
          List
        </li>
        <li
          className={`help-nav${activeClass("markdownTaskList")}`}
          data-target="markdownTaskList"
          onClick={() => toggleActiveTarget("markdownTaskList")}
        >
          Checklist
        </li>
        <li
          className={`help-nav${activeClass("markdownImages")}`}
          data-target="markdownImages"
          onClick={() => toggleActiveTarget("markdownImages")}
        >
          Image
        </li>
        <li
          className={`help-nav${activeClass("markdownBlockquotes")}`}
          data-target="markdownBlockquotes"
          onClick={() => toggleActiveTarget("markdownBlockquotes")}
        >
          Blockquote
        </li>
        <li
          className={`help-nav${activeClass("markdownCodes")}`}
          data-target="markdownCodes"
          onClick={() => toggleActiveTarget("markdownCodes")}
        >
          Code
        </li>
        <li
          className={`help-nav${activeClass("markdownTables")}`}
          data-target="markdownTables"
          onClick={() => toggleActiveTarget("markdownTables")}
        >
          Table
        </li>
        <li
          className={`help-nav${activeClass("markdownShortLinks")}`}
          data-target="markdownShortLinks"
          onClick={() => toggleActiveTarget("markdownShortLinks")}
        >
          Short Link
        </li>
      </ul>
      <ul className="markdown-help-wrap">
        <li className={`markdown-help-item markdownHeaders${activeClass("markdownHeaders")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_HEADER_SAMPLE}</pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_HEADER_SAMPLE} />
            </div>
          </div>
        </li>
        <li className={`markdown-help-item markdownStyling${activeClass("markdownStyling")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_STYLING_SAMPLE}</pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_STYLING_SAMPLE} />
            </div>
          </div>
        </li>
        <li className={`markdown-help-item markdownLinks${activeClass("markdownLinks")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_LINK_SAMPLE}</pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_LINK_OUTPUT_SAMPLE} />
            </div>
          </div>
        </li>
        <li className={`markdown-help-item markdownLists${activeClass("markdownLists")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_LIST_INPUT_SAMPLE}</pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_LIST_OUTPUT_SAMPLE} />
            </div>
          </div>
        </li>
        <li className={`markdown-help-item markdownTaskList${activeClass("markdownTaskList")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_TASK_LIST_SAMPLE}</pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap">
                <ul>
                  <li>
                    <input type="checkbox" /> Todos
                    <ul>
                      <li>
                        <input type="checkbox" defaultChecked /> To do A
                      </li>
                      <li>
                        <input type="checkbox" /> To do B
                      </li>
                      <li>
                        <input type="checkbox" /> To do C
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </li>
        <li className={`markdown-help-item markdownImages${activeClass("markdownImages")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_IMAGE_INPUT_SAMPLE}</pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_IMAGE_OUTPUT_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          className={`markdown-help-item markdownBlockquotes${activeClass("markdownBlockquotes")}`}
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_BLOCKQUOTE_SAMPLE}</pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_BLOCKQUOTE_SAMPLE} />
            </div>
          </div>
        </li>
        <li className={`markdown-help-item markdownCodes${activeClass("markdownCodes")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_CODE_SAMPLE}</pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_CODE_SAMPLE} />
            </div>
          </div>
        </li>
        <li className={`markdown-help-item markdownTables${activeClass("markdownTables")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_TABLE_INPUT_SAMPLE}</pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_TABLE_OUTPUT_SAMPLE} />
            </div>
          </div>
        </li>
        <li className={`markdown-help-item markdownShortLinks${activeClass("markdownShortLinks")}`}>
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>{MARKDOWN_SHORT_LINK_SAMPLE}</pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap">
                <p>
                  Issue no: <Link to="http://demo.yobi.io/yobi/yobi/issue/2">#2</Link>
                </p>
                <p></p>
                <p>
                  Mention: <Link to="http://demo.yobi.io/yobi">@yobi</Link>
                </p>
                <p>
                  commit: <Link to="http://demo.yobi.io/yobi/yobi/commit/763575">@763575</Link> or{" "}
                  <Link to="http://demo.yobi.io/yobi/yobi/commit/763575f177a4ce8b9370954de3ea1a1410205593">
                    @763575
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}
