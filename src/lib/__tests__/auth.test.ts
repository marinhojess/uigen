// @vitest-environment node
import { test, expect, vi, afterEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  name: "",
  value: "",
  options: {} as Record<string, unknown>,
  set(name: string, value: string, options: Record<string, unknown>) {
    this.name = name;
    this.value = value;
    this.options = options;
  },
};

vi.mock("next/headers", () => ({
  cookies: () => mockCookieStore,
}));

afterEach(() => {
  mockCookieStore.name = "";
  mockCookieStore.value = "";
  mockCookieStore.options = {};
  vi.clearAllMocks();
});

test("createSession sets the auth-token cookie", async () => {
  const { createSession } = await import("../auth");
  await createSession("user-123", "user@example.com");
  expect(mockCookieStore.name).toBe("auth-token");
});

test("createSession sets a valid JWT with userId and email", async () => {
  const { createSession } = await import("../auth");
  await createSession("user-123", "user@example.com");

  const secret = new TextEncoder().encode("development-secret-key");
  const { payload } = await jwtVerify(mockCookieStore.value, secret);

  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("user@example.com");
});

test("createSession sets cookie with httpOnly and correct options", async () => {
  const { createSession } = await import("../auth");
  await createSession("user-123", "user@example.com");

  expect(mockCookieStore.options.httpOnly).toBe(true);
  expect(mockCookieStore.options.sameSite).toBe("lax");
  expect(mockCookieStore.options.path).toBe("/");
});

test("createSession sets cookie expiry ~7 days from now", async () => {
  const before = Date.now();
  const { createSession } = await import("../auth");
  await createSession("user-123", "user@example.com");
  const after = Date.now();

  const expires = (mockCookieStore.options.expires as Date).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expires).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});
