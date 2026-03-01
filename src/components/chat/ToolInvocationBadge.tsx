"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolInvocation: {
    toolName: string;
    args: Record<string, unknown>;
    state: string;
    result?: unknown;
  };
}

export function getLabel(toolInvocation: { toolName: string; args: Record<string, unknown> }): string {
  const { toolName, args } = toolInvocation;
  const command = args.command as string | undefined;
  const filename = args.path ? (args.path as string).split("/").pop() : undefined;

  if (toolName === "str_replace_editor" && command && filename) {
    const map: Record<string, string> = {
      create: `Creating ${filename}`,
      str_replace: `Editing ${filename}`,
      insert: `Editing ${filename}`,
      view: `Reading ${filename}`,
      undo_edit: `Undoing edit in ${filename}`,
    };
    return map[command] ?? toolName;
  }

  if (toolName === "file_manager" && command && filename) {
    const map: Record<string, string> = {
      rename: `Renaming ${filename}`,
      delete: `Deleting ${filename}`,
    };
    return map[command] ?? toolName;
  }

  return toolName;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const label = getLabel(toolInvocation);
  const isDone = toolInvocation.state === "result" && toolInvocation.result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
