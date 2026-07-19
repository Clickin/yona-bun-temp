import { Link, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import legacySpriteUrl from "../../assets/legacy/sprite.png";
import { useLegacyMessages } from "../../i18n";
import { globalBreakpoints } from "../../theme.stylex";
import { paginationColors } from "./-pagination.stylex";

const paginationDynamicStyles = stylex.create({
  sprite: (spriteUrl: string) => ({
    "--site-pagination-sprite": `url(${spriteUrl})`,
  }),
});

const paginationStyles = stylex.create({
  root: {
    clear: "both",
    margin: "20px 0px",
    textAlign: "center",
    width: "100%",
  },
  list: {
    display: "inline-block",
    fontSize: "0px",
    listStyle: "none",
    margin: {
      default: "0px 0px 0px -120px",
      [globalBreakpoints.mobile]: "0px",
    },
    padding: "0px",
  },
  item: {
    color: paginationColors.text,
    display: "inline-block",
    fontSize: "12px",
    padding: "0px 10px",
  },
  iconItem: { padding: "0px 5px" },
  delimiter: {
    color: paginationColors.delimiter,
    padding: "0px 5px",
  },
  link: { fontSize: "12px" },
  input: {
    appearance: "textfield",
    borderColor: {
      default: paginationColors.inputBorder,
      ":focus": paginationColors.accent,
      ":hover": paginationColors.accent,
    },
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: {
      default: "none",
      ":focus": paginationColors.inputFocusShadow,
      ":hover": paginationColors.inputFocusShadow,
    },
    color: {
      default: null,
      ":focus": paginationColors.accent,
      ":hover": paginationColors.accent,
    },
    fontWeight: "700",
    margin: "0px",
    textAlign: "center",
    width: "30px",
  },
  icon: {
    backgroundImage: "var(--site-pagination-sprite)",
    backgroundRepeat: "no-repeat",
    display: "inline-block",
    height: "9px",
    verticalAlign: "middle",
    width: "6px",
  },
  prevIcon: { backgroundPosition: "-136px -139px", marginRight: "10px" },
  prevIconDisabled: { backgroundPosition: "-164px -2px" },
  nextIcon: { backgroundPosition: "-146px -139px", marginLeft: "10px" },
  nextIconDisabled: { backgroundPosition: "-23px -13px" },
  label: {
    color: paginationColors.accent,
    fontSize: "11px",
  },
  labelDisabled: { color: paginationColors.text },
});

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
    <div
      {...stylex.props(paginationStyles.root, paginationDynamicStyles.sprite(legacySpriteUrl))}
      data-stylex-owner="site-pagination-root"
      id="pagination"
    >
      <ul {...stylex.props(paginationStyles.list)} data-stylex-owner="site-pagination-list">
        <li {...stylex.props(paginationStyles.item, paginationStyles.iconItem)}>
          {hasPrev ? (
            <Link
              {...stylex.props(paginationStyles.link)}
              to={stripBasePath(basePath, pageHref(currentPage - 1))}
            >
              <i {...stylex.props(paginationStyles.icon, paginationStyles.prevIcon)}></i>
              <span {...stylex.props(paginationStyles.label)}>{prevPageLabel}</span>
            </Link>
          ) : (
            <>
              <i
                {...stylex.props(
                  paginationStyles.icon,
                  paginationStyles.prevIcon,
                  paginationStyles.prevIconDisabled,
                )}
              ></i>
              <span {...stylex.props(paginationStyles.label, paginationStyles.labelDisabled)}>
                {prevPageLabel}
              </span>
            </>
          )}
        </li>
        <li {...stylex.props(paginationStyles.item)}>
          <input
            {...stylex.props(paginationStyles.input)}
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
        <li {...stylex.props(paginationStyles.item, paginationStyles.delimiter)}>/</li>
        <li {...stylex.props(paginationStyles.item)}>{totalPages}</li>
        <li {...stylex.props(paginationStyles.item, paginationStyles.iconItem)}>
          {hasNext ? (
            <Link
              {...stylex.props(paginationStyles.link)}
              to={stripBasePath(basePath, pageHref(currentPage + 1))}
            >
              <span {...stylex.props(paginationStyles.label)}>{nextPageLabel}</span>
              <i {...stylex.props(paginationStyles.icon, paginationStyles.nextIcon)}></i>
            </Link>
          ) : (
            <>
              <span {...stylex.props(paginationStyles.label, paginationStyles.labelDisabled)}>
                {nextPageLabel}
              </span>
              <i
                {...stylex.props(
                  paginationStyles.icon,
                  paginationStyles.nextIcon,
                  paginationStyles.nextIconDisabled,
                )}
              ></i>
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
