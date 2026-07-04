import { Link } from "@tanstack/react-router";

export function LegacyMarkdownHelp() {
  return (
    <div className="markdown-help">
      <ul className="markdown-help-nav">
        <li>
          <span className="label">Markdown help</span>
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownHeaders">
          Header
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownStyling">
          Text Style
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownLinks">
          Link
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownLists">
          List
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownTaskList">
          Checklist
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownImages">
          Image
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownBlockquotes">
          Blockquote
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownCodes">
          Code
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownTables">
          Table
        </li>
        <li className="help-nav" data-toggle="markdown-help" data-target="markdownShortLinks">
          Short Link
        </li>
      </ul>
      <ul className="markdown-help-wrap">
        <li className="markdown-help-item markdownHeaders">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre># This is an H1 ## This is an H2 ### This is an H3</pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap" {...{ markdown: "true" }}>
                # This is an H1 ## This is an H2 ### This is an H3
              </div>
            </div>
          </div>
        </li>
        <li className="markdown-help-item markdownStyling">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>*This is an italic* **This is an bold** ~~This is an strike~~</pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap" {...{ markdown: "true" }}>
                *This is an italic* **This is an bold** ~~This is an strike~~
              </div>
            </div>
          </div>
        </li>
        <li className="markdown-help-item markdownLinks">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>[Site](http://yobi.io/ "Yobi Site") http://yobi.io/</pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap" {...{ markdown: "true" }}>
                [Site](http://yobi.io/ "Yobi Site") http://yobi.io/
              </div>
            </div>
          </div>
        </li>
        <li className="markdown-help-item markdownLists">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>- Red 1. White 2. Blue - Green.</pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap" {...{ markdown: "true" }}>
                - Red 1. White 2. Blue - Green
              </div>
            </div>
          </div>
        </li>
        <li className="markdown-help-item markdownTaskList">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>- [ ] Todos - [x] To do A - [ ] To do B - [ ] To do C</pre>
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
        <li className="markdown-help-item markdownImages">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>![title](https://repo.yona.io/assets/images/ico-like-small.png "Yobi")</pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap" {...{ markdown: "true" }}>
                ![title](/assets/images/ico-like-small.png "Yobi")
              </div>
            </div>
          </div>
        </li>
        <li className="markdown-help-item markdownBlockquotes">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>
                &gt; Lorem ipsum dolor sit amet, consectetuer adipiscing elit. &gt; &gt; Aenean
                commodo ligula eget dolor.
              </pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap" {...{ markdown: "true" }}>
                &gt; Lorem ipsum dolor sit amet, consectetuer adipiscing elit. &gt; &gt; Aenean
                commodo ligula eget dolor.
              </div>
            </div>
          </div>
        </li>
        <li className="markdown-help-item markdownCodes">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>
                `function test() &#123;console.log("hello world");&#125;` ```javascript function
                test() &#123; console.log("hello world"); &#125; ```
              </pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap" {...{ markdown: "true" }}>
                `function test() &#123;console.log("hello world");&#125;` ```javascript function
                test() &#123; console.log("hello world"); &#125; ```
              </div>
            </div>
          </div>
        </li>
        <li className="markdown-help-item markdownTables">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>
                | Default | Align center | Align right | | ------------ | :----------: | ------: | |
                Carrot | Red | 1,000 | | Banana | Yellow | 32,000 |
              </pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap" {...{ markdown: "true" }}>
                | Default | Align center | Align right | | ------------ | :----------: | ------: | |
                Carrot | Red | 1,000 | | Banana | Yellow | 32,000 | Also, you can copy &amp; paste
                table from excel sheet
              </div>
            </div>
          </div>
        </li>
        <li className="markdown-help-item markdownShortLinks">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>
                Issue no: #2 Mention: @yobi commit: @763575 or
                @763575f177a4ce8b9370954de3ea1a1410205593
              </pre>
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
