import Header from "../src/components/Header";

import { render, waitFor, screen } from "@testing-library/react";
import { getAllByRole } from "@testing-library/dom";
import "@testing-library/jest-dom";

describe("Header", () => {
  it("should render with expected call-to-action buttons", () => {
    const results = render(<Header />);
    const buttons = getAllByRole(results.container, "button");
    expect(buttons).toHaveLength(2);
  });
});
