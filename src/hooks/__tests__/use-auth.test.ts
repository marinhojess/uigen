import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import * as actions from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import * as getProjectsModule from "@/actions/get-projects";
import * as createProjectModule from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-project-id" });
  });

  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("returns the result from the signIn action on failure", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;

      await act(async () => {
        returnValue = await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("returns the result from the signIn action on success", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;

      await act(async () => {
        returnValue = await result.current.signIn("test@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("sets isLoading to true while sign in is in-flight", async () => {
      let resolveSignIn!: (v: unknown) => void;
      (actions.signIn as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signIn("test@example.com", "password123"); });

      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignIn({ success: false, error: "err" }); });
    });

    test("resets isLoading to false after sign in completes", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false when the action throws", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not navigate when sign in fails", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("saves anon work to a new project and navigates to it after successful sign in", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Make a button" }],
        fileSystemData: { "/": { type: "directory" }, "/Button.jsx": { type: "file" } },
      });
      (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(createProjectModule.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ id: "1", role: "user", content: "Make a button" }],
          data: { "/": { type: "directory" }, "/Button.jsx": { type: "file" } },
        })
      );
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("clears anon work after saving it", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: {},
      });
      (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
    });

    test("skips anon work when messages array is empty and navigates to most recent project", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(createProjectModule.createProject).not.toHaveBeenCalled();
      expect(anonTracker.clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/recent-project");
    });

    test("navigates to the most recent project when no anon work exists", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "most-recent" },
        { id: "older" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/most-recent");
      expect(createProjectModule.createProject).not.toHaveBeenCalled();
    });

    test("creates a blank project when no anon work and no existing projects", async () => {
      (actions.signIn as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(createProjectModule.createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/new-project-id");
    });
  });

  describe("signUp", () => {
    test("returns the result from the signUp action on failure", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;

      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    });

    test("returns the result from the signUp action on success", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());
      let returnValue: unknown;

      await act(async () => {
        returnValue = await result.current.signUp("new@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("sets isLoading to true while sign up is in-flight", async () => {
      let resolveSignUp!: (v: unknown) => void;
      (actions.signUp as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => { resolveSignUp = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      act(() => { result.current.signUp("new@example.com", "password123"); });

      expect(result.current.isLoading).toBe(true);

      await act(async () => { resolveSignUp({ success: false, error: "err" }); });
    });

    test("resets isLoading to false after sign up completes", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false when the action throws", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("new@example.com", "password123");
        } catch {
          // expected
        }
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not navigate when sign up fails", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("saves anon work to a new project and navigates to it after successful sign up", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (anonTracker.getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [{ id: "1", role: "user", content: "Build a form" }],
        fileSystemData: { "/": { type: "directory" } },
      });
      (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "saved-anon-project" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(createProjectModule.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ id: "1", role: "user", content: "Build a form" }],
          data: { "/": { type: "directory" } },
        })
      );
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/saved-anon-project");
    });

    test("navigates to most recent project after successful sign up with no anon work", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "existing-proj" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
      expect(createProjectModule.createProject).not.toHaveBeenCalled();
    });

    test("creates a blank project after successful sign up when no projects exist", async () => {
      (actions.signUp as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjectsModule.getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProjectModule.createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "brand-new" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(createProjectModule.createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new");
    });
  });
});
