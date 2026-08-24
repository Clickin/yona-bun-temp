/* Shared legacy markdown comment/body editor. Formerly duplicated across the
 * issue-detail, post-detail, issue-form, post-form, milestone-form and
 * pull-request-form routes; each screen's rendered DOM contract (legacy
 * `mt10`/`nav nav-tabs nm small` shell, toolbar, textarea, preview pane,
 * notification receiver, data-owner markers) stays byte-identical,
 * with the per-screen differences (route-local style styles, owners,
 * tab renderer, toolbar wiring) arriving as props. Screens whose editors
 * carried extra composition logic (issue-form mention machinery, post-detail
 * mode-derived styles) pass that logic in through the same props.
 */
import { Link } from "@tanstack/react-router";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  type TextareaHTMLAttributes,
} from "react";
import { useLegacyMessages } from "../i18n";
import { LegacyMarkdownHelp } from "../routes/-legacy-markdown-help";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Result of `style.props(...)` spread onto an element (className + inline style). */
// ponytail: stable empty-object default so destructuring never allocates per render.
const NO_OWNERS = {};

/** Client-owned preview used by every screen that does not pass previewChildren
 * (product decision 2026-08-24: no server markdown-render roundtrip). */
const defaultPreview = (active: boolean, value: string) =>
  active ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown> : null;

export type MarkdownEditorStyleProps = Readonly<{
  className?: string;
  style?: Readonly<Record<string, string | number>>;
}>;

type EditorTab = "edit" | "preview";

export type MarkdownEditorProps = {
  /** Complete literal className of the wrapper div (incl. any style class). */
  wrapperClassName: string;
  /** style.props() result spread onto the wrapper div. */
  wrapperStyleProps?: MarkdownEditorStyleProps;
  wrapperOwner?: string;
  wrapperInstance?: string;
  wrapperDataToggle?: string;
  /** Complete literal className of the tab <ul>; default `nav nav-tabs nm small`. */
  tabListClassName?: string;
  tabListStyleProps?: MarkdownEditorStyleProps;
  tabListOwner?: string;
  /** Render the edit/preview tab as a Link (hash navigation) or a button. */
  tabAs?: "button" | "link";
  tabLiStyleProps?: MarkdownEditorStyleProps;
  tabLiOwner?: string;
  tabContentStyleProps?: (tab: EditorTab, active: boolean) => MarkdownEditorStyleProps | undefined;
  tabContentOwner?: (tab: EditorTab, active: boolean) => string | undefined;
  /** Extra props (hash/search/activeProps) spread onto the tab Links. */
  tabLinkProps?: { edit?: Record<string, unknown>; preview?: Record<string, unknown> };
  /** Prevent default + stop propagation on tab clicks (legacy detail screens). */
  tabClickPreventDefault?: boolean;
  /** Controlled active tab; falls back to internal state when undefined (issue form). */
  activeTab?: EditorTab;
  onActiveTabChange?: (tab: EditorTab) => void;
  checklistClassName?: string;
  checklistStyleProps?: MarkdownEditorStyleProps;
  checklistOwner?: string;
  checklistButtonClassName?: string;
  checklistButtonStyleProps?: MarkdownEditorStyleProps;
  checklistButtonOwner?: string;
  checklistButtonAriaLabel?: string;
  checklistIconClassName?: string;
  checklistIconStyleProps?: MarkdownEditorStyleProps;
  checklistIconOwner?: string;
  onChecklistClick?: () => void;
  clearTemporaryClassName?: string;
  clearTemporaryStyleProps?: MarkdownEditorStyleProps;
  clearTemporaryOwner?: string;
  clearTemporaryAriaHidden?: boolean;
  clearTemporaryButtonTabIndex?: number;
  noticeLabelClassName?: string;
  noticeLabelStyleProps?: MarkdownEditorStyleProps;
  noticeLabelOwner?: string;
  noticeContent?: ReactNode;
  /** Complete literal className of the tab-content div. */
  tabContentClassName: string;
  tabContentPaneStyleProps?: MarkdownEditorStyleProps;
  tabContentPaneOwner?: string;
  tabContentPaneInstance?: string;
  /** Markdown help block rendered above the panes; default <LegacyMarkdownHelp />. */
  help?: ReactNode;
  editPaneId: string;
  editPaneStyleProps?: (tab: EditorTab, active: boolean) => MarkdownEditorStyleProps | undefined;
  editPaneOwner?: string;
  textareaBoxClassName?: string;
  textareaBoxStyleProps?: MarkdownEditorStyleProps;
  textareaBoxOwner?: string;
  textareaBoxRef?: RefObject<HTMLDivElement | null>;
  onTextareaBoxBlurCapture?: (event: FocusEvent<HTMLDivElement>) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
  textareaName: string;
  textareaId: string;
  textareaClassName?: string;
  textareaStyleProps?: MarkdownEditorStyleProps;
  /** Spread the textarea style after the className (overriding it); issue form only. */
  textareaStyleFirst?: boolean;
  textareaOwner?: string;
  /** Value of the `data-editor-mode` attribute; omit to drop the attribute. */
  textareaMode?: string;
  textareaTabIndex?: number;
  textareaDefaultValue?: string;
  textareaValue?: string;
  textareaOnChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  textareaOnFocus?: () => void;
  textareaKey?: string | number;
  /** Remaining textarea attributes/handlers (aria, paste/drop, keydown...). */
  textareaExtraProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
  /** Nodes rendered inside the textarea-box after the textarea (mention UI...). */
  textareaExtras?: ReactNode;
  /** Initial value for the shell-managed controlled textarea (post detail). */
  value?: string;
  internalValue?: boolean;
  previewPaneId: string;
  previewPaneStyleProps?: (tab: EditorTab, active: boolean) => MarkdownEditorStyleProps | undefined;
  previewPaneOwner?: string;
  /** Complete literal className of the preview div. */
  previewClassName?: string;
  previewStyleProps?: MarkdownEditorStyleProps;
  previewOwner?: string;
  /** Renders the preview content; receives the active flag and the current textarea value. */
  previewChildren?: (active: boolean, value: string) => ReactNode;
  notificationClassName?: string;
  notificationStyleProps?: MarkdownEditorStyleProps;
  /** style spread applied to the notification receiver only while revealed (issue detail). */
  notificationRevealStyle?: MarkdownEditorStyleProps;
  notificationOwner?: string;
  notificationInstance?: string;
  notificationTitleClassName?: string;
  notificationTitleStyleProps?: MarkdownEditorStyleProps;
  notificationTitleOwner?: string;
  notificationTitleTrailingSpace?: boolean;
};

// ponytail: hoisted tab renderers (React Doctor: no-render-in-render). All render
// inputs travel through the context so the component body stays JSX-only.
type TabRenderContext = {
  tabAs: "button" | "link";
  tabContentStyleProps?: (tab: EditorTab, active: boolean) => MarkdownEditorStyleProps | undefined;
  tabContentOwner?: (tab: EditorTab, active: boolean) => string | undefined;
  tabLinkProps?: { edit?: Record<string, unknown>; preview?: Record<string, unknown> };
  onTabClick: (tab: EditorTab) => (event: MouseEvent<HTMLElement>) => void;
  tabLiStyleProps?: MarkdownEditorStyleProps;
  tabLiOwner?: string;
  activeTab: EditorTab;
};

function EditorTab({
  ctx,
  tab,
  active,
  label,
}: {
  ctx: TabRenderContext;
  tab: EditorTab;
  active: boolean;
  label: string;
}) {
  const contentStyleProps = ctx.tabContentStyleProps?.(tab, active);
  const owner = ctx.tabContentOwner?.(tab, active);
  if (ctx.tabAs === "link") {
    return (
      <Link
        to="."
        {...ctx.tabLinkProps?.[tab]}
        {...contentStyleProps}
        data-owner={owner}
        onClick={ctx.onTabClick(tab)}
      >
        {label}
      </Link>
    );
  }
  return (
    <button type="button" {...contentStyleProps} data-owner={owner} onClick={ctx.onTabClick(tab)}>
      {label}
    </button>
  );
}

function EditorTabItem({
  ctx,
  tab,
  label,
}: {
  ctx: TabRenderContext;
  tab: EditorTab;
  label: string;
}) {
  const active = ctx.activeTab === tab;
  return (
    <li
      {...ctx.tabLiStyleProps}
      className={
        ctx.tabLiStyleProps
          ? `${ctx.tabLiStyleProps.className ?? ""}${active ? " active" : ""}`.trim()
          : active
            ? "active"
            : undefined
      }
      data-owner={ctx.tabLiOwner}
    >
      <EditorTab ctx={ctx} tab={tab} active={active} label={label} />
    </li>
  );
}

export function MarkdownEditor({
  wrapperClassName,
  wrapperStyleProps,
  wrapperOwner,
  wrapperInstance,
  wrapperDataToggle,
  tabListClassName = "nav nav-tabs nm small",
  tabListStyleProps,
  tabListOwner,
  tabAs = "button",
  tabLiStyleProps,
  tabLiOwner,
  tabContentStyleProps,
  tabContentOwner,
  tabLinkProps,
  tabClickPreventDefault = false,
  activeTab: activeTabProp,
  onActiveTabChange,
  checklistClassName = "task-list-button",
  checklistStyleProps,
  checklistOwner,
  checklistButtonClassName = "add-task-list-button ybtn ybtn-small ybtn-danger-no-outline",
  checklistButtonStyleProps,
  checklistButtonOwner,
  checklistButtonAriaLabel,
  checklistIconClassName = "yobicon-list task-list-icon",
  checklistIconStyleProps,
  checklistIconOwner,
  onChecklistClick,
  clearTemporaryClassName = "editor-clear-temporary",
  clearTemporaryStyleProps,
  clearTemporaryOwner,
  clearTemporaryAriaHidden,
  clearTemporaryButtonTabIndex,
  noticeLabelClassName = "editor-notice-label",
  noticeLabelStyleProps,
  noticeLabelOwner,
  noticeContent,
  tabContentClassName,
  tabContentPaneStyleProps,
  tabContentPaneOwner,
  tabContentPaneInstance,
  help = <LegacyMarkdownHelp />,
  editPaneId,
  editPaneStyleProps,
  editPaneOwner,
  textareaBoxClassName = "textarea-box",
  textareaBoxStyleProps,
  textareaBoxOwner,
  textareaBoxRef,
  onTextareaBoxBlurCapture,
  textareaRef,
  textareaName,
  textareaId,
  textareaClassName = "editorSeries content comment nm",
  textareaStyleProps,
  textareaStyleFirst = true,
  textareaOwner,
  textareaMode,
  textareaTabIndex,
  textareaDefaultValue,
  textareaValue,
  textareaOnChange,
  textareaOnFocus,
  textareaKey,
  textareaExtraProps,
  textareaExtras,
  value,
  internalValue = false,
  previewPaneId,
  previewPaneStyleProps,
  previewPaneOwner,
  previewClassName,
  previewStyleProps,
  previewOwner,
  previewChildren,
  notificationClassName = "notification-receiver",
  notificationStyleProps,
  notificationRevealStyle,
  notificationOwner,
  notificationInstance,
  notificationTitleClassName = "notification-receiver-title",
  notificationTitleStyleProps,
  notificationTitleOwner,
  notificationTitleTrailingSpace = false,
}: MarkdownEditorProps) {
  const { t } = useLegacyMessages();
  const [internalActiveTab, setInternalActiveTab] = useState<EditorTab>("edit");
  const [editorValue, setEditorValue] = useState(
    value ?? textareaValue ?? textareaDefaultValue ?? "",
  );
  const [notificationVisible, setNotificationVisible] = useState(false);
  const activeTab = activeTabProp ?? internalActiveTab;
  const changeTab = (tab: EditorTab) => {
    if (activeTabProp === undefined) {
      setInternalActiveTab(tab);
    }
    onActiveTabChange?.(tab);
  };

  const handleTabClick = (tab: EditorTab) => (event: MouseEvent<HTMLElement>) => {
    if (tabClickPreventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
    changeTab(tab);
  };

  const notificationTitle = (
    <>
      <span
        {...notificationTitleStyleProps}
        className={`${notificationTitleStyleProps?.className ?? ""} ${notificationTitleClassName}`.trim()}
        data-owner={notificationTitleOwner}
      >
        {t("notification.receiver.list.title")}
        {notificationTitleTrailingSpace ? " " : null}
      </span>
      <span className="notification-receiver-list"></span>
    </>
  );

  return (
    <div
      {...wrapperStyleProps}
      className={wrapperClassName}
      data-owner={wrapperOwner}
      data-owner-instance={wrapperInstance}
      data-toggle={wrapperDataToggle}
    >
      <ul {...tabListStyleProps} className={tabListClassName} data-owner={tabListOwner}>
        <EditorTabItem
          ctx={{
            tabAs,
            tabContentStyleProps,
            tabContentOwner,
            tabLinkProps,
            onTabClick: handleTabClick,
            tabLiStyleProps,
            tabLiOwner,
            activeTab,
          }}
          tab="edit"
          label={t("common.editor.edit")}
        />
        <EditorTabItem
          ctx={{
            tabAs,
            tabContentStyleProps,
            tabContentOwner,
            tabLinkProps,
            onTabClick: handleTabClick,
            tabLiStyleProps,
            tabLiOwner,
            activeTab,
          }}
          tab="preview"
          label={t("common.editor.preview")}
        />
        <li>
          <div {...checklistStyleProps} className={checklistClassName} data-owner={checklistOwner}>
            <button
              type="button"
              {...checklistButtonStyleProps}
              className={checklistButtonClassName}
              data-owner={checklistButtonOwner}
              aria-label={checklistButtonAriaLabel}
              onClick={onChecklistClick}
            >
              <i
                {...checklistIconStyleProps}
                className={checklistIconClassName}
                data-owner={checklistIconOwner}
              ></i>{" "}
              {t("button.add.checklist")}
            </button>
          </div>
        </li>
        <li>
          <div
            {...clearTemporaryStyleProps}
            className={clearTemporaryClassName}
            data-owner={clearTemporaryOwner}
            aria-hidden={clearTemporaryAriaHidden}
          >
            <div className="editor-clear-temporary-button">
              <button
                type="button"
                id="button-clear-temporary"
                className="ybtn ybtn-small ybtn-warning"
                tabIndex={clearTemporaryButtonTabIndex}
              >
                {t("button.clear.temporary")}
              </button>
            </div>
          </div>
        </li>
        <li>
          <div
            {...noticeLabelStyleProps}
            className={noticeLabelClassName}
            data-owner={noticeLabelOwner}
          >
            {noticeContent}
          </div>
        </li>
      </ul>
      <div
        {...tabContentPaneStyleProps}
        className={tabContentClassName}
        data-owner={tabContentPaneOwner}
        data-owner-instance={tabContentPaneInstance}
      >
        {help}
        <div
          {...editPaneStyleProps?.("edit", activeTab === "edit")}
          id={editPaneId}
          className={`${editPaneStyleProps?.("edit", activeTab === "edit")?.className ?? ""} tab-pane${activeTab === "edit" ? " active" : ""}`.trim()}
          data-owner={editPaneOwner}
        >
          <div
            {...textareaBoxStyleProps}
            ref={textareaBoxRef}
            className={`${textareaBoxStyleProps?.className ?? ""} ${textareaBoxClassName}`.trim()}
            data-owner={textareaBoxOwner}
            onBlurCapture={onTextareaBoxBlurCapture}
          >
            <textarea
              {...(textareaStyleFirst ? textareaStyleProps : undefined)}
              ref={textareaRef}
              name={textareaName}
              className={`${textareaStyleProps?.className ?? ""} ${textareaClassName}`.trim()}
              data-owner={textareaOwner}
              data-editor-mode={textareaMode}
              id={textareaId}
              key={textareaKey}
              tabIndex={textareaTabIndex}
              {...(internalValue
                ? { value: editorValue }
                : textareaValue !== undefined
                  ? { value: textareaValue }
                  : textareaDefaultValue !== undefined
                    ? { defaultValue: textareaDefaultValue }
                    : {})}
              onChange={(event) => {
                setEditorValue(event.currentTarget.value);
                if (!internalValue) textareaOnChange?.(event);
              }}
              onFocus={
                notificationRevealStyle ? () => setNotificationVisible(true) : textareaOnFocus
              }
              {...textareaExtraProps}
              {...(textareaStyleFirst ? undefined : textareaStyleProps)}
              {...{ markdown: "true" }}
            ></textarea>
            {textareaExtras}
          </div>
        </div>
        <div
          {...previewPaneStyleProps?.("preview", activeTab === "preview")}
          id={previewPaneId}
          className={`${previewPaneStyleProps?.("preview", activeTab === "preview")?.className ?? ""} tab-pane${activeTab === "preview" ? " active" : ""}`.trim()}
          data-owner={previewPaneOwner}
        >
          <div
            {...previewStyleProps}
            className={`${previewStyleProps?.className ?? ""} ${previewClassName ?? `markdown-preview markdown-wrap ${textareaMode ?? ""}`}`.trim()}
            data-owner={previewOwner}
            data-via-email="false"
          >
            {(previewChildren ?? defaultPreview)(activeTab === "preview", editorValue)}
          </div>
        </div>
        {notificationRevealStyle ? (
          <div
            className={notificationClassName}
            {...(notificationVisible ? notificationRevealStyle : {})}
            data-owner={notificationOwner}
            data-owner-instance={notificationInstance}
          >
            {notificationTitle}
          </div>
        ) : (
          <div
            {...notificationStyleProps}
            className={`${notificationStyleProps?.className ?? ""} ${notificationClassName}`.trim()}
            data-owner={notificationOwner}
            data-owner-instance={notificationInstance}
          >
            {notificationTitle}
          </div>
        )}
      </div>
    </div>
  );
}

export type BoardPostMarkdownEditorProps = {
  focusRequest: number;
  value: string;
  /** Already-compacted Link `search` value (post form); identity updater otherwise. */
  search?: unknown;
  /** Link `activeProps` (post form passes `{}` to disable active styling). */
  linkActiveProps?: Record<string, unknown>;
  tabIndex?: number;
  wrapperClassName: string;
  wrapperStyle?: MarkdownEditorStyleProps;
  editorStyle?: MarkdownEditorStyleProps;
  tabListStyle?: MarkdownEditorStyleProps;
  tabContentClassName: string;
  tabContentPaneStyleProps?: MarkdownEditorStyleProps;
  notificationStyle?: MarkdownEditorStyleProps;
  /** Markdown help block rendered above the panes; default <LegacyMarkdownHelp />. */
  help?: ReactNode;
  owners?: {
    wrapper?: string;
    tabs?: string;
    editor?: string;
    tabContent?: string;
    notification?: string;
  };
};

export function BoardPostMarkdownEditor({
  focusRequest,
  value,
  search,
  linkActiveProps,
  tabIndex = 2,
  wrapperClassName,
  wrapperStyle,
  editorStyle,
  tabListStyle,
  tabContentClassName,
  tabContentPaneStyleProps,
  notificationStyle,
  help,
  owners = NO_OWNERS,
}: BoardPostMarkdownEditorProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusRequest > 0) {
      bodyRef.current?.focus();
    }
  }, [focusRequest]);
  const tabLinkProps = {
    edit: {
      hash: "edit-body",
      search: search ?? ((previous: unknown) => previous),
      ...(linkActiveProps !== undefined ? { activeProps: linkActiveProps } : {}),
    },
    preview: {
      hash: "preview-body",
      search: search ?? ((previous: unknown) => previous),
      ...(linkActiveProps !== undefined ? { activeProps: linkActiveProps } : {}),
    },
  };
  return (
    <MarkdownEditor
      value={value}
      wrapperClassName={wrapperClassName}
      wrapperStyleProps={wrapperStyle}
      wrapperOwner={owners.wrapper}
      tabListClassName={`${tabListStyle?.className ?? ""} nav nav-tabs nm small`.trim()}
      tabListStyleProps={tabListStyle}
      tabListOwner={owners.tabs}
      tabAs="link"
      tabLinkProps={tabLinkProps}
      tabContentClassName={tabContentClassName}
      tabContentPaneStyleProps={tabContentPaneStyleProps}
      tabContentPaneOwner={owners.tabContent}
      editPaneId="edit-body"
      previewPaneId="preview-body"
      textareaRef={bodyRef}
      textareaName="body"
      textareaId="editor-body-body"
      textareaStyleProps={editorStyle}
      textareaOwner={owners.editor}
      textareaMode="content-body"
      textareaTabIndex={tabIndex}
      textareaDefaultValue={value}
      previewClassName="markdown-preview markdown-wrap content-body"
      notificationClassName={`${notificationStyle?.className ?? ""} notification-receiver`.trim()}
      notificationStyleProps={notificationStyle}
      notificationOwner={owners.notification}
      help={help}
    />
  );
}

export type MilestoneMarkdownEditorProps = {
  contentsRef?: RefObject<HTMLTextAreaElement | null>;
  contents?: string;
  focusRequest?: number;
  dataToggle?: boolean;
  wrapperClassName: string;
  wrapperStyle?: MarkdownEditorStyleProps;
  tabListStyle?: MarkdownEditorStyleProps;
  tabContentClassName: string;
  owners?: { wrapper?: string; tabs?: string; tabContent?: string };
};

export function MilestoneMarkdownEditor({
  contentsRef,
  contents,
  focusRequest,
  dataToggle = false,
  wrapperClassName,
  wrapperStyle,
  tabListStyle,
  tabContentClassName,
  owners = NO_OWNERS,
}: MilestoneMarkdownEditorProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = contentsRef ?? internalRef;
  useEffect(() => {
    if (focusRequest !== undefined && focusRequest > 0) {
      textareaRef.current?.focus();
    }
  }, [focusRequest, textareaRef]);
  return (
    <MarkdownEditor
      value={contents ?? ""}
      wrapperStyleProps={wrapperStyle}
      wrapperOwner={owners.wrapper}
      wrapperDataToggle={dataToggle ? "markdown-editor" : undefined}
      tabListClassName={`${tabListStyle?.className ?? ""} nav nav-tabs nm small`.trim()}
      tabListStyleProps={tabListStyle}
      tabListOwner={owners.tabs}
      tabContentClassName={tabContentClassName}
      tabContentPaneOwner={owners.tabContent}
      editPaneId="edit-content-body"
      previewPaneId="preview-content-body"
      textareaRef={textareaRef}
      textareaName="contents"
      textareaId="editor-contents-content-body"
      textareaMode="content-body"
      textareaTabIndex={2}
      textareaDefaultValue={contents}
      previewClassName="markdown-preview markdown-wrap content-body"
    />
  );
}

export type PullRequestMarkdownEditorProps = {
  bodyValue?: string;
  mergeSuggestionRevision?: number;
  onBodyChange?: (nextBody: string) => void;
  value?: string;
  wrapperClassName: string;
  wrapperStyle?: MarkdownEditorStyleProps;
  editorStyle?: MarkdownEditorStyleProps;
  tabContentClassName: string;
  tabContentPaneStyleProps?: MarkdownEditorStyleProps;
  owners?: { wrapper?: string; tabContent?: string };
};

export function PullRequestMarkdownEditor({
  bodyValue,
  mergeSuggestionRevision,
  onBodyChange,
  value,
  wrapperClassName,
  wrapperStyle,
  editorStyle,
  tabContentClassName,
  tabContentPaneStyleProps,
  owners = NO_OWNERS,
}: PullRequestMarkdownEditorProps) {
  const hasBodyValue = bodyValue !== undefined;
  return (
    <MarkdownEditor
      value={hasBodyValue ? bodyValue : (value ?? "")}
      wrapperClassName={wrapperClassName}
      wrapperStyleProps={wrapperStyle}
      wrapperOwner={owners.wrapper}
      tabContentClassName={tabContentClassName}
      tabContentPaneStyleProps={tabContentPaneStyleProps}
      tabContentPaneOwner={owners.tabContent}
      editPaneId="edit-body"
      previewPaneId="preview-body"
      textareaName="body"
      textareaId="editor-body-body"
      textareaStyleProps={editorStyle}
      textareaMode="content-body"
      textareaDefaultValue={hasBodyValue ? bodyValue : value}
      textareaKey={hasBodyValue ? `body-${mergeSuggestionRevision}` : undefined}
      textareaOnChange={
        hasBodyValue && onBodyChange
          ? (event) => onBodyChange(event.currentTarget.value)
          : undefined
      }
      previewClassName="markdown-preview markdown-wrap content-body"
    />
  );
}
