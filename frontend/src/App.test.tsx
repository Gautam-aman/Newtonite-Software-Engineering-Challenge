import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App, { client } from "./App";
import { api, ApiError, setToken, transitions, type Item } from "./api";
const team = { id: "team-1", name: "Platform Operations", role: "MEMBER" };
const user = {
  id: "user-1",
  name: "Aman Gautam",
  email: "member@newtonops.local",
};
const item: Item = {
  id: "item-1",
  title: "Investigate API latency",
  description: "Review the impact",
  type: "INCIDENT",
  priority: "HIGH",
  status: "OPEN",
  teamId: team.id,
  teamName: team.name,
  assigneeId: null,
  assigneeName: null,
  createdBy: user.id,
  dueDate: null,
  version: 0,
  createdAt: "2026-10-16T00:00:00Z",
  updatedAt: "2026-10-16T00:00:00Z",
};
let conflict = false;
let unavailable = false;
let loginFailed = false;
let writes: unknown[] = [];
const fetchMock = vi.fn();
function response(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}
beforeEach(() => {
  window.history.replaceState({}, "", "/");
  client.clear();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, retry: false },
  });
  setToken(null);
  conflict = false;
  unavailable = false;
  loginFailed = false;
  writes = [];
  fetchMock.mockReset();
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url === "/api/auth/login")
      return loginFailed
        ? response(
            {
              code: "INVALID_CREDENTIALS",
              message: "Email or password is incorrect.",
            },
            401,
          )
        : response({ token: "demo-token", user });
    if (url === "/api/teams") return response([team]);
    if (url.startsWith("/api/teams/"))
      return response([{ id: user.id, name: user.name, role: "MEMBER" }]);
    if (url.startsWith("/api/dashboard"))
      return unavailable
        ? response(
            { code: "UNAVAILABLE", message: "Please retry shortly." },
            503,
          )
        : response({
            metrics: {
              active: 12,
              mine: 3,
              urgent: 2,
              approvals: 0,
              overdue: 1,
              completed: 8,
            },
            distribution: [{ status: "OPEN", count: 12 }],
            recent: [],
          });
    if (url === "/api/items" && init?.method === "POST") {
      writes.push(JSON.parse(String(init.body)));
      return response({ ...item, ...JSON.parse(String(init.body)) }, 201);
    }
    if (url.endsWith("/claim"))
      return conflict
        ? response(
            {
              code: "CLAIM_CONFLICT",
              message:
                "This item changed or was already claimed. Refresh to see its current owner.",
            },
            409,
          )
        : response({
            ...item,
            assigneeId: user.id,
            assigneeName: user.name,
            version: 1,
          });
    if (url.includes("/activity") || url.includes("/comments"))
      return response({ items: [], nextCursor: null });
    if (url === "/api/items/item-1")
      return response(
        conflict
          ? {
              ...item,
              assigneeId: "someone",
              assigneeName: "Maya Chen",
              version: 1,
            }
          : item,
      );
    if (url.startsWith("/api/items?"))
      return response({ items: [item], nextCursor: null });
    return response({});
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});
async function signIn() {
  render(<App />);
  await userEvent.click(
    screen.getByRole("button", { name: "Sign in to NewtonOps" }),
  );
  await screen.findByText("A clear view. A focused team.");
}
describe("connected workspace", () => {
  it("signs in and displays backend metrics", async () => {
    await signIn();
    expect((await screen.findAllByText("12")).length).toBeGreaterThan(0);
    expect(
      fetchMock.mock.calls.find(([u]) => u.startsWith("/api/dashboard"))?.[1]
        .headers.Authorization,
    ).toBe("Bearer demo-token");
  });
  it("shows an authentication error without entering the workspace", async () => {
    loginFailed = true;
    render(<App />);
    await userEvent.click(
      screen.getByRole("button", { name: "Sign in to NewtonOps" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect.",
    );
    expect(
      screen.queryByText("A clear view. A focused team."),
    ).not.toBeInTheDocument();
  });
  it("creates an item with validation, an idempotency key and real API data", async () => {
    await signIn();
    await userEvent.click(screen.getByRole("button", { name: "New item" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Create item" }),
    );
    expect(
      await screen.findByText("Give this item a clear title."),
    ).toBeInTheDocument();
    await userEvent.type(
      screen.getByPlaceholderText("What needs to happen?"),
      "Review settlement",
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Create item" }),
    );
    await waitFor(() => expect(writes).toHaveLength(1));
    expect(writes[0]).toMatchObject({
      title: "Review settlement",
      teamId: team.id,
    });
    const call = fetchMock.mock.calls.find(
      ([u, init]) => u === "/api/items" && init.method === "POST",
    );
    expect(call?.[1].headers["Idempotency-Key"]).toBeTruthy();
  });
  it("sends filters to the server", async () => {
    await signIn();
    await userEvent.click(screen.getByRole("link", { name: /Work items/ }));
    await screen.findByRole("table");
    await userEvent.selectOptions(
      screen.getByLabelText("Filter status"),
      "IN_PROGRESS",
    );
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u]) =>
            u.includes("/api/items?") && u.includes("status=IN_PROGRESS"),
        ),
      ).toBe(true),
    );
    await userEvent.type(screen.getByLabelText("Search work items"), "latency");
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => u.includes("q=latency"))).toBe(
        true,
      ),
    );
  });
  it("shows a conflict and reconciles only when refresh is requested", async () => {
    await signIn();
    await userEvent.click(screen.getByRole("link", { name: /Work items/ }));
    await screen.findByRole("table");
    await userEvent.click(
      screen.getByRole("link", { name: "Open Investigate API latency" }),
    );
    await screen.findByRole("button", { name: "Claim this item" });
    conflict = true;
    await userEvent.click(
      screen.getByRole("button", { name: "Claim this item" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This item changed",
    );
    expect(
      screen.getByRole("button", { name: "Claim this item" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Refresh latest data" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Claim this item" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Maya Chen")).toBeInTheDocument();
  });
  it("renders API failures with a retry action", async () => {
    unavailable = true;
    await signIn();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Please retry shortly.",
    );
    unavailable = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect((await screen.findAllByText("12")).length).toBeGreaterThan(0);
  });
});
describe("permission and transport contracts", () => {
  it("only offers permitted workflow actions", () => {
    const pending = {
      ...item,
      status: "AWAITING_APPROVAL" as const,
      assigneeId: user.id,
    };
    expect(transitions(pending, "MEMBER", user.id)).toEqual([]);
    expect(transitions(pending, "LEAD", user.id)).toEqual([
      "RESOLVED",
      "IN_PROGRESS",
    ]);
    expect(
      transitions({ ...item, assigneeId: user.id }, "MEMBER", user.id),
    ).toEqual(["IN_PROGRESS"]);
    expect(
      transitions({ ...item, assigneeId: "other" }, "MEMBER", user.id),
    ).toEqual([]);
    expect(transitions(pending, "VIEWER", user.id)).toEqual([]);
  });
  it("reports network errors and expires unauthorized sessions", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network"));
    await expect(api("/items")).rejects.toMatchObject({ code: "NETWORK" });
    const expired = vi.fn();
    window.addEventListener("session-expired", expired);
    fetchMock.mockImplementationOnce(() =>
      response({ code: "UNAUTHENTICATED", message: "Please sign in." }, 401),
    );
    await expect(api("/items")).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener("session-expired", expired);
  });
});

it("offers accessible password visibility and exclusive demo-role selection", async () => {
  render(<App />);
  const password = screen.getByLabelText("Password");
  expect(password).toHaveAttribute("type", "password");
  await userEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(password).toHaveAttribute("type", "text");
  await userEvent.click(screen.getByRole("button", { name: "lead" }));
  expect(screen.getByLabelText("Email address")).toHaveValue(
    "lead@newtonops.local",
  );
  expect(screen.getByRole("button", { name: "lead" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "member" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

it("traps mobile navigation focus and restores the trigger on Escape", async () => {
  await signIn();
  const trigger = screen.getByRole("button", { name: "Open navigation" });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", {
    name: "Workspace navigation",
  });
  expect(
    within(dialog).getByRole("link", { name: "Work items" }),
  ).toBeInTheDocument();
  expect(document.body).toHaveAttribute("data-scroll-locked");
  await userEvent.keyboard("{Escape}");
  await waitFor(
    () => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    { timeout: 2000 },
  );
  expect(trigger).toHaveFocus();
});

it("focuses a new route while preserving search focus during refetch", async () => {
  await signIn();
  await userEvent.click(screen.getByRole("link", { name: "Work items" }));
  const heading = await screen.findByRole("heading", {
    name: "Work, with a clear direction.",
  });
  await waitFor(() => expect(heading).toHaveFocus());
  await userEvent.keyboard("/");
  const search = screen.getByRole("textbox", { name: "Search work items" });
  expect(search).toHaveFocus();
  await userEvent.type(search, "review");
  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([url]) => url.includes("q=review"))).toBe(
      true,
    ),
  );
  expect(search).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  expect(search).toHaveValue("");
});

it("returns focus to the create trigger after the lazy editor closes", async () => {
  await signIn();
  const opener = screen.getByRole("button", { name: "New item" });
  await userEvent.click(opener);
  await screen.findByLabelText("Title");
  await userEvent.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(opener).toHaveFocus());
});

it("focuses the destination heading after navigating through the drawer", async () => {
  await signIn();
  await userEvent.click(
    screen.getByRole("button", { name: "Open navigation" }),
  );
  const drawer = await screen.findByRole("dialog", {
    name: "Workspace navigation",
  });
  await userEvent.click(
    within(drawer).getByRole("link", { name: "Work items" }),
  );
  const heading = await screen.findByRole("heading", {
    name: "Work, with a clear direction.",
  });
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(heading).toHaveFocus());
  expect(document.title).toBe("Work, with a clear direction. · NewtonOps");
});
