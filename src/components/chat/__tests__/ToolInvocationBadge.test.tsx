import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getLabel, ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// getLabel unit tests
test("getLabel: str_replace_editor + create", () => {
  expect(getLabel({ toolName: "str_replace_editor", args: { command: "create", path: "src/Card.tsx" } })).toBe("Creating Card.tsx");
});

test("getLabel: str_replace_editor + str_replace", () => {
  expect(getLabel({ toolName: "str_replace_editor", args: { command: "str_replace", path: "src/Card.tsx" } })).toBe("Editing Card.tsx");
});

test("getLabel: str_replace_editor + insert", () => {
  expect(getLabel({ toolName: "str_replace_editor", args: { command: "insert", path: "src/Card.tsx" } })).toBe("Editing Card.tsx");
});

test("getLabel: str_replace_editor + view", () => {
  expect(getLabel({ toolName: "str_replace_editor", args: { command: "view", path: "src/Card.tsx" } })).toBe("Reading Card.tsx");
});

test("getLabel: str_replace_editor + undo_edit", () => {
  expect(getLabel({ toolName: "str_replace_editor", args: { command: "undo_edit", path: "src/Card.tsx" } })).toBe("Undoing edit in Card.tsx");
});

test("getLabel: file_manager + rename", () => {
  expect(getLabel({ toolName: "file_manager", args: { command: "rename", path: "src/Card.tsx" } })).toBe("Renaming Card.tsx");
});

test("getLabel: file_manager + delete", () => {
  expect(getLabel({ toolName: "file_manager", args: { command: "delete", path: "src/Card.tsx" } })).toBe("Deleting Card.tsx");
});

test("getLabel: unknown tool falls back to toolName", () => {
  expect(getLabel({ toolName: "unknown_tool", args: { command: "something", path: "src/Card.tsx" } })).toBe("unknown_tool");
});

test("getLabel: unknown command falls back to toolName", () => {
  expect(getLabel({ toolName: "str_replace_editor", args: { command: "unknown_command", path: "src/Card.tsx" } })).toBe("str_replace_editor");
});

test("getLabel: nested path extracts filename", () => {
  expect(getLabel({ toolName: "str_replace_editor", args: { command: "create", path: "src/components/Card.tsx" } })).toBe("Creating Card.tsx");
});

test("getLabel: no path falls back to toolName", () => {
  expect(getLabel({ toolName: "str_replace_editor", args: { command: "create" } })).toBe("str_replace_editor");
});

// Component render tests
test("ToolInvocationBadge: done state renders green dot and label", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "src/Card.tsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
  const dot = document.querySelector(".bg-emerald-500");
  expect(dot).toBeDefined();
});

test("ToolInvocationBadge: pending state renders spinner and label", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "src/Button.tsx" },
        state: "call",
      }}
    />
  );

  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
  const spinner = document.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
});
