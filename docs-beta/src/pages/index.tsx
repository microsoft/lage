import React from "react";
import Layout from "@theme/Layout";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import "../../static/tailwind/tailwind-styles.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { TwoColumns } from "../components/TwoColumns";
import { Highlight } from "../components/Highlight";
import { Placeholder } from "../components/Placeholder";
import { Point } from "../components/Point";
import { Description } from "../components/Description";
import { Quote } from "../components/Quote";

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout>
      <main className="theme-color bg-gradient-to-r from-body to-body-gradient">
        <Header/>
        <TwoColumns>
          <Placeholder/>
          <div>
            <Point>Speeding up your repo takes no time</Point>
            <Description>Lage is simple to setup and works everywhere. It just takes a minute, seriously!</Description>
            <Highlight toLeft={false} content="Use one of our clouds, or bring your own!"/>
          </div>
        </TwoColumns>

        <TwoColumns>
           <div>
            <Point>Seriously, never build more than once</Point>
            <Description>Building once is painful enough! Lage will remember what is done before and skip any work that is not
              needed. Lage even skips the work based on your changes… really!</Description>
            <Highlight toLeft={true} content="It’s not just you. Lage will skip work if others already did it too!" />
          </div>
          <Placeholder/>
        </TwoColumns>

        <TwoColumns>
          <Placeholder/>
          <div>
            <Point>Discover what is slowing you down</Point>
            <Description>With the built-in profiler, Lage will let you see exactly where the bottlenecks are. Yes, you can be the
              hero of your team.</Description>
            <Highlight toLeft={false} content="Visualize your build graphs with Lage’s suite of tools." />
          </div>
        </TwoColumns>
        <Quote author="Jason Gore" organization="Microsoft Loop"> 
          Lage upends the notion that monorepo builds have to be linear and sequential, [it] leverages <span className="text-point">modern processing power</span> and is incredibly powerful and configurable.
          </Quote>
      </main>
      <Footer />
    </Layout>
  );
}
