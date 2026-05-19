import * as React from "react";
import { uploadTemporaryAttachment, type UploadedAttachment } from "../api/attachments";
import type { RuntimeConfig } from "../runtime-config";

function imageFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  const itemFiles: File[] = [];
  for (const item of Array.from(dataTransfer?.items ?? [])) {
    if (item.kind !== "file" || !item.type.toLowerCase().startsWith("image/")) {
      continue;
    }
    const file = item.getAsFile();
    if (file) {
      itemFiles.push(file);
    }
  }
  if (itemFiles.length > 0) {
    return itemFiles;
  }
  return Array.from(dataTransfer?.files ?? []).filter((file) =>
    file.type.toLowerCase().startsWith("image/"),
  );
}

export function markdownTextForAttachment(attachment: UploadedAttachment): string {
  const name = attachment.name || "image.png";
  const link = `[${name}](${attachment.url}) `;
  return attachment.mimeType.toLowerCase().startsWith("image/") ? `!${link}` : link;
}

export function insertMarkdownText(value: string, cursorIndex: number, markdownText: string) {
  const cursor = Math.max(0, Math.min(cursorIndex, value.length));
  return {
    cursorIndex: cursor + markdownText.length,
    value: `${value.slice(0, cursor)}${markdownText}${value.slice(cursor)}`,
  };
}

export function MarkdownAttachmentTextarea(props: {
  ariaLabel?: string;
  className?: string;
  csrfToken?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onAttachmentUpload: (attachment: UploadedAttachment) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  runtimeConfig: RuntimeConfig;
  value: string;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const handleImageFiles = async (textarea: HTMLTextAreaElement, files: File[]) => {
    const csrfToken = props.csrfToken;
    if (!csrfToken || files.length === 0) {
      return;
    }
    const attachments = await Promise.all(
      files.map((file) => uploadTemporaryAttachment(props.runtimeConfig, csrfToken, file)),
    );
    let nextValue = textarea.value;
    let nextCursor = textarea.selectionStart ?? nextValue.length;
    for (const attachment of attachments) {
      const inserted = insertMarkdownText(
        nextValue,
        nextCursor,
        markdownTextForAttachment(attachment),
      );
      nextValue = inserted.value;
      nextCursor = inserted.cursorIndex;
      props.onAttachmentUpload(attachment);
    }
    props.onChange(nextValue);
    window.requestAnimationFrame(() => {
      textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
      textareaRef.current?.focus();
    });
  };

  return (
    <textarea
      aria-label={props.ariaLabel}
      className={props.className}
      disabled={props.disabled}
      id={props.id}
      name={props.name}
      onChange={(event) => props.onChange(event.target.value)}
      onDragOver={(event) => {
        if (props.csrfToken && imageFilesFromDataTransfer(event.dataTransfer).length > 0) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        const files = imageFilesFromDataTransfer(event.dataTransfer);
        if (files.length === 0) {
          return;
        }
        event.preventDefault();
        void handleImageFiles(event.currentTarget, files);
      }}
      onPaste={(event) => {
        const files = imageFilesFromDataTransfer(event.clipboardData);
        if (files.length === 0) {
          return;
        }
        event.preventDefault();
        void handleImageFiles(event.currentTarget, files);
      }}
      placeholder={props.placeholder}
      ref={textareaRef}
      required={props.required}
      value={props.value}
    />
  );
}
