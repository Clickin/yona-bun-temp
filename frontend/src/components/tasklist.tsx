import type { ChangeEvent } from "react";

export type TasklistUpdate = {
  content: string;
  original: string;
};

type TasklistInputProps = {
  checked?: boolean;
  canUpdate: boolean;
  onToggle: (index: number, checked: boolean) => void;
  tasklistIndex: number;
};

export function TasklistInput({
  checked,
  canUpdate,
  onToggle,
  tasklistIndex,
}: TasklistInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggle(tasklistIndex, event.currentTarget.checked);
  };
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled={!canUpdate}
      onChange={handleChange}
    />
  );
}

const taskPattern = /^([ ]*)([-+*] \[)([ xX]?)(\][^\r\n]*)(\r?\n|$)/u;

function parseTasklist(markdown: string) {
  const lines = markdown.match(/[^\n]*(?:\n|$)/gu)?.filter((line) => line.length > 0) ?? [];
  const tasks: { lineIndex: number; indent: number; checked: boolean }[] = [];
  let fence: string | null = null;
  lines.forEach((line, lineIndex) => {
    const content = line.replace(/\r?\n$/u, "");
    const fenceMatch = content.match(/^ {0,3}(`{3,}|~{3,})/u);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1][0];
      else if (fence === fenceMatch[1][0]) fence = null;
      return;
    }
    if (fence !== null) return;
    const match = content.match(taskPattern);
    if (match) tasks.push({
      lineIndex,
      indent: match[1].length,
      checked: match[3].toLowerCase() === "x",
    });
  });
  return { lines, tasks };
}

export function getTasklistProgress(markdown: string) {
  const { tasks } = parseTasklist(markdown);
  return {
    completed: tasks.reduce((count, task) => count + Number(task.checked), 0),
    total: tasks.length,
  };
}

export function updateTasklistMarkdown(
  markdown: string,
  tasklistIndex: number,
  checked: boolean,
): string {
  const { lines, tasks } = parseTasklist(markdown);
  const selected = tasks[tasklistIndex];
  if (!selected) return markdown;
  let insideDescendants = false;
  let taskCursor = 0;
  return lines
    .map((line, lineIndex) => {
      const listItem = line.match(/^([ ]*)(?:[-+*]|\d+[.)])\s/u);
      if (insideDescendants && listItem && listItem[1].length <= selected.indent) {
        insideDescendants = false;
      }
      if (tasks[taskCursor]?.lineIndex !== lineIndex) return line;
      const taskIndex = taskCursor++;
      const match = line.match(taskPattern);
      if (!match) return line;
      if (taskIndex === tasklistIndex) {
        insideDescendants = true;
      }
      if (taskIndex !== tasklistIndex && !insideDescendants) return line;
      const [, indent, prefix, _state, suffix, newline] = match;
      return `${indent}${prefix}${checked ? "x" : " "}${suffix}${newline}`;
    })
    .join("");
}
