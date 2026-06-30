import { createFileRoute } from "@tanstack/react-router";
import legacyUiKitTemplate from "../../../yona-original/app/views/help/UIKit.scala.html?raw";

export const Route = createFileRoute("/_UIKit")({
  component: UIKitRoute,
});

const legacyBody = extractBetween(legacyUiKitTemplate, "<body>", "</body>");
const legacyPageWrapInner = extractBetween(
  legacyBody,
  '<div class="page-wrap-outer">',
  '<footer class="page-footer-outer">',
);

function UIKitRoute() {
  return (
    <>
      <style>{`body { color:#ccc; }
dl { display:inline-block; margin:18px; }
dd { margin-left:0; }
.gnb-logo { display:inline-block !important; }
.gnb-outer { text-align:center; }
.subtitle { font-size:24px; font-weight:bold; height:55px; line-height:55px; vertical-align:bottom; }
.css { font-family: Consolas; color: #222; background: #C9EBB5; padding: 3px; border-radius: 3px; border: 1px solid #4CB848; }`}</style>
      <header className="gnb-outer">
        <span className="subtitle">Yobi UI</span>
      </header>
      <div className="page-wrap-outer" dangerouslySetInnerHTML={{ __html: legacyPageWrapInner }} />
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

function extractBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`Legacy UIKit template marker not found: ${start} ... ${end}`);
  }
  return source.slice(startIndex + start.length, endIndex);
}
