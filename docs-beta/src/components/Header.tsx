import React from "react";
import Link from "@docusaurus/Link";
import SideBySide from "./SideBySide";
import TwoColumns from "./TwoColumns";

export default function Header() {
  return (
    <header className="theme-color flex h-screen justify-center items-center pb-36">
      <TwoColumns>
        <div>
          <p className="font-londrina font-extrabold text-6xl px-12 pb-4 pt-12 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-point">
            Never build the <br /> same code twice
          </p>
          <p className="font-bahnschrift text-primary text-3xl px-12 mb-4">
            Give your monorepo the smarts to <i>actually</i> save you time
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
        <div>
          <img className="mx-auto w-3/4 h-3/4 px-3 md:w-full lg:w-full md:h-full lg:h-full" src="img/placeholder.png" />
        </div>
      </TwoColumns>
    </header>
  );
}
