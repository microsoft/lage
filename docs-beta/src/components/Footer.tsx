import React from "react";
import Link from "@docusaurus/Link";
import SideBySide from "./SideBySide";
import TwoColumns from "./TwoColumns";
import Tools from "./Tools";

export default function Footer() {
  return (
    <div className="theme-color bg-black py-8">
      <TwoColumns>
        <div>
          <img className="mx-12 py-8" src="img/placeholder.png" />
        </div>
        <div>
          <h1 className="font-londrina text-primary font-bold text-4xl px-12 py-8">Seeing is believing -- Give Lage a spin</h1>
          <p className="font-bahnschrift text-primary whitespace-pre-wrap py-4 px-12 text-lg">
            There’s no better time than now to save yourself time. Get started within a minute with a single command!{" "}
          </p>
          <p className="font-bahnschrift text-primary text-center whitespace-pre-wrap mx-12 mb-4 w-36 bg-body-2 text-2xl">
            {" "}
            npx lage init{" "}
          </p>
          <SideBySide>
            <Link className="font-bahnschrift text-button hover:text-black border-button bg-white inline-block py-2 px-4 rounded hover:no-underline font-bold border-2 text-lg" to="/docs/Introducing Lage/Overview">
              Get Started
            </Link>
            <Link className="font-bahnschrift text-white hover:text-button border-white bg-transparent inline-block py-2 px-4 rounded hover:no-underline font-bold border-2 text-lg" to="/docs/Introducing Lage/Overview">
              Try the Demo
            </Link>
          </SideBySide>
        </div>
      </TwoColumns>

      <p className="font-londrina text-white font-bold text-6xl pt-12 px-12"> Better Together</p>
      <p className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 text-lg px-12">
        This is about the other tools that Lage work with. This is about the other tools that Lage work with. This is
        about the other tools that Lage work with. This is about the other tools that Lage work with. This is about the
        other tools that Lage work with. This is about the other tools that Lage work with. This is about the other
        tools that Lage work with.
      </p>
      <div className="px-12">
        <Tools />
      </div>
    </div>
  );
}
