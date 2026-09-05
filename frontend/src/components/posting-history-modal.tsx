/* Shared issue/post "수정 이력" (change history) modal. Legacy renders the
 * same partial (`yona-original/app/views/common/partial_history.scala.html`)
 * on both issue view and board view with `id="-yona-posting-history"` and the
 * bootstrap `modal hide` shell (header/body/footer, no backdrop). React owns
 * open/close state; the body keeps each screen's body markdown renderer so
 * the history matches the post body (XML comments stripped, highlight and
 * markdown syntax applied).
 */
import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useLegacyMessages } from "../i18n";

export function stripMarkdownComments(markdown: string) {
  return markdown.replace(/<!--[\s\S]*?-->/gu, "");
}

export function insulateModalButtonClick(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function closeOnEscape(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
}

export function useModalFocus(open: boolean) {
  const modalRef = useRef<HTMLDivElement>(null);
  // oxlint-disable-next-line react-doctor/no-effect-event-handler -- focus-on-open is the standard modal accessibility pattern (legacy bootstrap `.modal in` + autofocus), not an event simulation.
  useLayoutEffect(() => {
    if (open) {
      modalRef.current?.focus();
    }
  }, [open]);
  return modalRef;
}

export function PostingHistoryModal({
  children,
  dataOwner,
  onClose,
  open,
}: {
  children: ReactNode;
  dataOwner: string;
  onClose: () => void;
  open: boolean;
}) {
  const { t } = useLegacyMessages();
  const modalRef = useModalFocus(open);
  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    insulateModalButtonClick(event);
    onClose();
  };
  return (
    <div
      ref={modalRef}
      id="-yona-posting-history"
      className={open ? "modal in" : "modal hide"}
      data-owner={dataOwner}
      role="dialog"
      tabIndex={open ? -1 : undefined}
      onKeyDown={(event) => closeOnEscape(event, onClose)}
    >
      <div className="modal-header">
        <button type="button" className="close" aria-hidden="true" onClick={handleClose}>
          ×
        </button>
        <h5 className="nm">{t("change.history")}</h5>
      </div>
      <div className="modal-body">{children}</div>
      <div className="modal-footer">
        <button className="ybtn ybtn-info ybtn-small" aria-hidden="true" onClick={handleClose}>
          {t("button.confirm")}
        </button>
      </div>
    </div>
  );
}
