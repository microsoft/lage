import React from "react";
import "../css/tailwind-styles.css";
import { Description } from "../components/Description";
import NavBar from "../components/NavBar";
import { useState } from "react";
import { FlowGraph } from "../components/flow-graph/FlowGraph";
import { Point } from "../components/Point";

export default function Grapher() {
  const [input, setInput] = useState(
    '{"packages": ["a","c","d","b"],"dependencies": [{"name": "a","dependency": "c"},{"name": "d","dependency": "c"},{"name": "c","dependency": "b"},{"name": "a","dependency": "b"},{"name": "d","dependency": "b"},{"name": "d","dependency": "a"}]}'
  );
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

  return (
    <div className="theme-color bg-bodySecondary h-screen">
      <NavBar />
      <Point>Dependency Graph Visualizer</Point>
      <Description>
        After running the <span className="text-button font-bold">graph </span>
        command in your root directory, copy and paste the content of the <span className="text-button font-bold">
          graph-output.js
        </span>{" "}
        file here. <br />
        The content should be a JSON object.
      </Description>
      <form>
        <div className="flex justify-content items-end mx-12">
          <textarea
            className="bg-white border rounded py-2 px-3 text-black w-80 h-80"
            onChange={(event) => setInput(event.target.value)}
            value={input}
            placeholder='{"packages": ["a","c","d","b"],"dependencies": [{"name": "a","dependency": "c"},{"name": "d","dependency": "c"},{"name": "c","dependency": "b"},{"name": "a","dependency": "b"},{"name": "d","dependency": "b"},{"name": "d","dependency": "a"}]}'
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
        {showGraph && <FlowGraph>{graphInput}</FlowGraph>}
      </form>
    </div>
  );
}
