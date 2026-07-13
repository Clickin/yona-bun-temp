import { Link, useRouter } from "@tanstack/react-router";
import { useLegacyMessages } from "../../i18n";

export function SitePagination({
  basePath,
  currentPage,
  pageHref,
  totalPages,
}: {
  basePath: string;
  currentPage: number;
  pageHref: (pageNum: number) => string;
  totalPages: number;
}) {
  const router = useRouter();
  const { t } = useLegacyMessages();
  const prevPageLabel = t("button.prevPage");
  const nextPageLabel = t("button.nextPage");

  if (totalPages <= 0) {
    return <div id="pagination"></div>;
  }

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <div id="pagination" className="page-navigation-wrap">
      <ul className="page-nums">
        <li className="page-num ikon">
          {hasPrev ? (
            <Link to={stripBasePath(basePath, pageHref(currentPage - 1))}>
              <i className="ico btn-pg-prev"></i>
              <span>{prevPageLabel}</span>
            </Link>
          ) : (
            <>
              <i className="ico btn-pg-prev off"></i>
              <span className="off">{prevPageLabel}</span>
            </>
          )}
        </li>
        <li className="page-num">
          <input
            className="input-mini nospinner"
            defaultValue={currentPage}
            key={`${currentPage}-${totalPages}`}
            max={totalPages}
            min={1}
            name="pageNum"
            onClick={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              const inputValue = event.currentTarget.value;
              if (!/^[0-9]+$/.test(inputValue)) {
                event.currentTarget.value = String(currentPage);
                return;
              }
              const nextPage = Math.min(Math.max(Number(inputValue), 1), totalPages);
              event.currentTarget.value = String(nextPage);
              router.history.push(stripBasePath(basePath, pageHref(nextPage)));
            }}
            pattern="[0-9]*"
            type="number"
          />
        </li>
        <li className="page-num delimiter">/</li>
        <li className="page-num">{totalPages}</li>
        <li className="page-num ikon">
          {hasNext ? (
            <Link to={stripBasePath(basePath, pageHref(currentPage + 1))}>
              <span>{nextPageLabel}</span>
              <i className="ico btn-pg-next"></i>
            </Link>
          ) : (
            <>
              <span className="off">{nextPageLabel}</span>
              <i className="ico btn-pg-next off"></i>
            </>
          )}
        </li>
      </ul>
    </div>
  );
}

function stripBasePath(basePath: string, href: string) {
  if (basePath === "/" || basePath === "") {
    return href;
  }
  if (href === basePath) {
    return "/";
  }
  return href.startsWith(`${basePath}/`) ? href.slice(basePath.length) : href;
}
