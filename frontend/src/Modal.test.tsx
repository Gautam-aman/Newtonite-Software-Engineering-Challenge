import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { useState } from "react";
import { Modal } from "./ui";
afterEach(cleanup);
it("restores an editor opener after Escape and releases the scroll lock", async () => {
  function Fixture() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>Open editor</button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Editor"
          description="Edit work"
        >
          <input aria-label="Title" />
        </Modal>
      </>
    );
  }
  render(<Fixture />);
  const opener = screen.getByRole("button", { name: "Open editor" });
  await userEvent.click(opener);
  await screen.findByRole("dialog", { name: "Editor" });
  expect(document.body).toHaveAttribute("data-scroll-locked");
  await userEvent.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await waitFor(() => expect(opener).toHaveFocus());
  expect(document.body).not.toHaveAttribute("data-scroll-locked");
});
