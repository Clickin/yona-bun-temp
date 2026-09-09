import type { ChangeEvent } from "react";
import {
  parseMarkdown,
  type BlockNode,
  type InlineNode,
  type ListItemNode,
  type MarkdownDocument,
} from "@tanstack/markdown";

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

export function TasklistInput({ checked, canUpdate, onToggle, tasklistIndex }: TasklistInputProps) {
  const toggleTask = (event: ChangeEvent<HTMLInputElement>) => {
    onToggle(tasklistIndex, event.currentTarget.checked);
  };
  return (
    <input type="checkbox" checked={Boolean(checked)} disabled={!canUpdate} onChange={toggleTask} />
  );
}

type SourceTask = {
  checked: boolean;
  markerStart: number;
  markerEnd: number;
};

export type TasklistTask = {
  ancestors: ListItemNode[];
  checked: boolean;
  item: ListItemNode;
  ordinal: number;
  source?: SourceTask;
};

export type TasklistMapping = {
  tasks: TasklistTask[];
  byItem: WeakMap<ListItemNode, TasklistTask>;
};

type AstTask = Omit<TasklistTask, "ordinal" | "source">;

function taskItemsInBlocks(
  blocks: BlockNode[],
  ancestors: ListItemNode[] = [],
  tasks: AstTask[] = [],
) {
  for (const block of blocks) {
    if (block.type === "blockquote") {
      taskItemsInBlocks(block.children, ancestors, tasks);
      continue;
    }
    if (block.type !== "list") continue;
    for (const item of block.items) {
      if (item.checked !== undefined) {
        tasks.push({ ancestors, checked: item.checked, item });
      }
      taskItemsInBlocks(item.children, [...ancestors, item], tasks);
    }
  }
  return tasks;
}

function lineParts(line: string) {
  let index = 0;
  let quoteDepth = 0;
  while (index < line.length) {
    const spaces = line.slice(index).match(/^ {0,3}/u)?.[0].length ?? 0;
    if (line[index + spaces] !== ">") break;
    index += spaces + 1;
    if (line[index] === " ") index += 1;
    quoteDepth += 1;
  }
  const content = line.slice(index);
  const indent = content.match(/^ */u)?.[0].length ?? 0;
  return { content, contentStart: index, indent, quoteDepth };
}

function sourceTasks(markdown: string): SourceTask[] {
  const lines = markdown.match(/[^\n]*(?:\n|$)/gu)?.filter((line) => line.length > 0) ?? [];
  const tasks: SourceTask[] = [];
  const listStack: Array<{ indent: number; quoteDepth: number }> = [];
  let fence: { char: "`" | "~"; length: number; quoteDepth: number } | null = null;
  let offset = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r?\n$/u, "");
    const { content, contentStart, indent, quoteDepth } = lineParts(line);
    const trimmed = content.slice(indent);
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)$/u);
    if (fence) {
      const close = trimmed.match(/^(`{3,}|~{3,})\s*$/u);
      if (
        close &&
        close[1][0] === fence.char &&
        close[1].length >= fence.length &&
        quoteDepth === fence.quoteDepth
      ) {
        fence = null;
      }
      offset += rawLine.length;
      continue;
    }
    if (fenceMatch && indent <= 3 && (fenceMatch[1][0] === "~" || !/[`]/u.test(fenceMatch[2]))) {
      fence = {
        char: fenceMatch[1][0] as "`" | "~",
        length: fenceMatch[1].length,
        quoteDepth,
      };
      listStack.length = 0;
      offset += rawLine.length;
      continue;
    }

    const listMatch = content.match(/^( *)(?:[-+*]|\d+[.)])\s+(\[[ xX]\])(?=$|\s)/u);
    if (listMatch && (indent < 4 || listStack.length > 0)) {
      while (
        listStack.length > 0 &&
        (listStack.at(-1)!.quoteDepth !== quoteDepth || listStack.at(-1)!.indent >= indent)
      ) {
        listStack.pop();
      }
      listStack.push({ indent, quoteDepth });
      tasks.push({
        checked: listMatch[2][1].toLowerCase() === "x",
        markerStart: offset + contentStart + listMatch.index! + listMatch[0].length - 3,
        markerEnd: offset + contentStart + listMatch.index! + listMatch[0].length,
      });
      offset += rawLine.length;
      continue;
    }

    if (line.trim().length > 0 && listStack.length > 0 && indent <= listStack[0].indent) {
      listStack.length = 0;
    }
    offset += rawLine.length;
  }
  return tasks;
}

function inlineTaskText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text" || node.type === "inlineCode" || node.type === "inlineHtml") {
        return node.value;
      }
      if (node.type === "image") return node.alt;
      return "children" in node ? inlineTaskText(node.children) : "";
    })
    .join("");
}

function sourceTaskText(markdown: string, source: SourceTask) {
  const lineEnd = markdown.indexOf("\n", source.markerEnd);
  return markdown
    .slice(source.markerEnd, lineEnd === -1 ? markdown.length : lineEnd)
    .replace(/[*_~`]/gu, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/\\([\\`*_\[\]{}()#+.!>-])/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizedTaskText(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

export function createTasklistMapping(
  markdown: string,
  document: MarkdownDocument = parseMarkdown(markdown, { allowHtml: true }),
): TasklistMapping {
  const astTasks = taskItemsInBlocks(document.children);
  const source = sourceTasks(markdown);
  const astTasksByText = new Map<string, AstTask[]>();
  for (const task of astTasks) {
    const first = task.item.children[0];
    const text =
      first?.type === "paragraph" ? normalizedTaskText(inlineTaskText(first.children)) : "";
    const key = `${task.checked}\u0000${text}`;
    const candidates = astTasksByText.get(key) ?? [];
    candidates.push(task);
    astTasksByText.set(key, candidates);
  }
  const astTaskOffsets = new Map<string, number>();
  const tasks: TasklistTask[] = [];
  for (const sourceTask of source) {
    const sourceText = normalizedTaskText(sourceTaskText(markdown, sourceTask));
    const key = `${sourceTask.checked}\u0000${sourceText}`;
    const candidates = astTasksByText.get(key) ?? [];
    const offset = astTaskOffsets.get(key) ?? 0;
    const matched = candidates[offset];
    if (!matched) continue;
    tasks.push({ ...matched, ordinal: tasks.length, source: sourceTask });
    astTaskOffsets.set(key, offset + 1);
  }
  const byItem = new WeakMap<ListItemNode, TasklistTask>();
  for (const task of tasks) byItem.set(task.item, task);
  return { byItem, tasks };
}

function isDescendant(task: TasklistTask, selected: TasklistTask) {
  return (
    task.item === selected.item || task.ancestors.some((ancestor) => ancestor === selected.item)
  );
}

export function getTasklistProgress(markdown: string) {
  const { tasks } = createTasklistMapping(markdown);
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
  const mapping = createTasklistMapping(markdown);
  const selected = mapping.tasks[tasklistIndex];
  if (!selected || mapping.tasks.some((task) => !task.source)) return markdown;
  const replacements: Array<{ end: number; replacement: string; start: number }> = [];
  for (const task of mapping.tasks) {
    if (isDescendant(task, selected)) {
      replacements.push({
        end: task.source!.markerEnd,
        replacement: checked ? "[x]" : "[ ]",
        start: task.source!.markerStart,
      });
    }
  }
  replacements.sort((left, right) => right.start - left.start);
  let updated = markdown;
  for (const replacement of replacements) {
    updated =
      updated.slice(0, replacement.start) +
      replacement.replacement +
      updated.slice(replacement.end);
  }
  return updated;
}
