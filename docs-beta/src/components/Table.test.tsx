import React from "react";
import Table from "./Table";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
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
