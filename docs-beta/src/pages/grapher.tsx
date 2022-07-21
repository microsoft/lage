import React from "react";
import "../css/tailwind-styles.css";
import { Description } from "../components/Description";
import NavBar from "../components/NavBar";
import { useState } from "react";
import { FlowGraph } from "../components/flow-graph/FlowGraph";
import { Point } from "../components/Point";

export default function Grapher() {
  const [input, setInput] = useState("");
  const [graphInput, setGraphInput] = useState("");
  const [showGraph, setShowGraph] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    try {
      const json = JSON.parse(input);
      setGraphInput(input);
      setShowGraph(true);
    } catch (e) {
      alert("invalid json");
      setGraphInput("");
      setShowGraph(false);
    }
  };

  const downloadTxtFile = () => {
    const element = document.createElement("a");
    const file = new Blob(
      [
        '{"packages": ["@nova/types","@nova/react","monorepo-scripts","@nova/react-test-utils"],"dependencies": [{"name": "@nova/types","dependency": "@nova/react"},{"name": "monorepo-scripts","dependency": "@nova/react"},{"name": "@nova/react","dependency": "@nova/react-test-utils"},{"name": "@nova/types","dependency": "@nova/react-test-utils"},{"name": "monorepo-scripts","dependency": "@nova/react-test-utils"},{"name": "monorepo-scripts","dependency": "@nova/types"}]}',
      ],
      {
        type: "text/plain",
      }
    );
    element.href = URL.createObjectURL(file);
    element.download = "content-example.txt";
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="theme-color bg-bodySecondary h-screen">
      <NavBar />
      <Point>Dependency Graph Visualizer</Point>
      <Description>
        After running the <span className="text-button font-bold">graph </span>
        command in your root directory, copy and paste the content of the{" "}
        <span className="text-button font-bold">output.js</span> file here.{" "}
        <br />
        The content should be a JSON object.
      </Description>
      <form>
        <div className="flex justify-content items-end mx-12">
          <textarea
            className="bg-white border rounded py-2 px-3 text-black w-80 h-80"
            onChange={(event) => setInput(event.target.value)}
            value={input}
            placeholder=" Paste the content here."
          />
          <button
            type="submit"
            onClick={handleSubmit}
            className="font-bahnschrift inline-block py-2 px-4 ml-4 rounded font-bold border-2 text-base text-black border-white bg-white"
          >
            Graph it!
          </button>
          <button
            className="font-bahnschrift inline-block py-2 px-4 ml-4 rounded font-bold border-2 text-base text-black border-white bg-white"
            onClick={() => {
              setInput(() => "");
              setGraphInput(() => "");
              setShowGraph(false);
            }}
          >
            Clear
          </button>
        </div>
        <Description>
          Don't know what to look for?{" "}
          <a
            className="text-black hover:text-bodyPrimary italic"
            onClick={downloadTxtFile}
          >
            {" "}
            Here is a content example.
          </a>
        </Description>
        {showGraph && <FlowGraph>{graphInput}</FlowGraph>}
      </form>
    </div>
  );
}
