import { fireEvent, render, screen } from "@testing-library/react";
import { PdfSearch, type PdfDocument } from "./PdfSearch.tsx";

it("loads text only on request and navigates through matching pages", async () => {
  const select = vi.fn();
  const getPage = vi.fn(async (number: number) => ({
    getTextContent: async () => ({
      items: [{ str: number === 2 ? "other text" : "A Match" }],
    }),
  }));
  render(
    <PdfSearch
      pdf={{ numPages: 3, getPage } as unknown as PdfDocument}
      onSelect={select}
    />,
  );
  expect(getPage).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Search PDF"), {
    target: { value: "match" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find" }));
  await screen.findByText("2 matching pages");
  expect(select).toHaveBeenLastCalledWith(0);
  fireEvent.click(screen.getByRole("button", { name: "Next match" }));
  expect(select).toHaveBeenLastCalledWith(2);
});
it("allows another search after a text-loading failure", async () => {
  const getPage = vi
    .fn()
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValue({
      getTextContent: async () => ({ items: [{ str: "hello" }] }),
    });
  render(
    <PdfSearch
      pdf={{ numPages: 1, getPage } as unknown as PdfDocument}
      onSelect={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Search PDF"), {
    target: { value: "missing" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find" }));
  await screen.findByText(
    "Couldn't search this PDF. The server didn't respond as expected. Try again.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Find" }));
  await screen.findByText("No matches");
});
it("names one matching page in the singular", async () => {
  const getPage = vi.fn(async () => ({
    getTextContent: async () => ({ items: [{ str: "unique words" }] }),
  }));
  render(
    <PdfSearch
      pdf={{ numPages: 1, getPage } as unknown as PdfDocument}
      onSelect={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Search PDF"), {
    target: { value: "unique" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find" }));
  expect(await screen.findByRole("status")).toHaveTextContent("1 matching page");
});
