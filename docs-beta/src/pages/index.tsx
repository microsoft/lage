import React from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TwoColumns from "../components/TwoColumns";
import "../../static/tailwind/tailwind-styles.css";
import { Highlight } from "../components/Highlight";

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout>
      <main className="theme-color bg-gradient-to-r from-body to-body-2">
        <Header />
        <TwoColumns>
          <div>
            <img className="mx-auto mt-3 px-12" src="img/placeholder.png" />
          </div>
          <div className="text-right justify-end">
            <h1 className="font-londrina text-point font-bold text-6xl pt-12 px-12">Speeding up your repo takes no time</h1>
            <p className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 text-lg px-12">
              Lage is simple to setup and works everywhere. It just takes a minute, seriously!
            </p>
            <Highlight toLeft={false} content="Use one of our clouds, or bring your own!" />
          </div>
        </TwoColumns>

        <TwoColumns>
           <div className="text-left">
            <h1 className="font-londrina text-point font-bold text-6xl pt-12 px-12">Seriously, never build more than once</h1>
            <p className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 text-lg px-12">
              Building once is painful enough! Lage will remember what is done before and skip any work that is not
              needed. Lage even skips the work based on your changes… really!
            </p>
            <Highlight toLeft={true} content="It’s not just you. Lage will skip work if others already did it too!" />
          </div>
           <div>
            <img className="mx-auto mt-3 px-12" src="img/placeholder.png" />
          </div>
        </TwoColumns>

        <TwoColumns className="mt-16">
          <div>
            <img className="mx-auto mt-3 px-12" src="img/placeholder.png" />
          </div>
          <div className="text-right justify-end">
            <h1 className="font-londrina text-point font-bold text-6xl pt-12 px-12">Discover what is slowing you down</h1>
            <p className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 text-lg px-12">
              With the built-in profiler, Lage will let you see exactly where the bottlenecks are. Yes, you can be the
              hero of your team.
            </p>
            <Highlight toLeft={false} content="Visualize your build graphs with Lage’s suite of tools." />
          </div>
        </TwoColumns>

        <p className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 text-3xl px-12 md:px-24 lg:px-48">
          Lage upends the notion that monorepo builds have to be linear and sequential, [it] leverages{" "}
          <span className="text-point">modern processing power</span> and is incredibly powerful and configurable.
        </p>
        <p className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 pb-24 text-xl px-12 md:px-24 lg:px-48">
          —Jason Gore, Microsoft Loop
        </p>
      </main>
      <Footer />
    </Layout>
  );
}
