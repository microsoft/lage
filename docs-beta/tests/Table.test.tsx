import Table from "../src/components/Table";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

const testElement = {
  name: "Lage",
  capabilities: {
    "Local computation caching": "Yes",
  },
};

test("Single element creates table.", () => {
  render(<Table tableContents={[testElement]} />);

  const table = screen.getByText(testElement.name);
  expect(table).toHaveTextContent(Object.keys(testElement.capabilities)[0]);
});
