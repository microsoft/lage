import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { TwoColumns } from "../components/TwoColumns";
import { Highlight } from "../components/Highlight";
import { Illustration } from "../components/Illustration";
import { Point } from "../components/Point";
import { Description } from "../components/Description";
import { Quote } from "../components/Quote";
import NavBar from "../components/NavBar";

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <div className="theme-color">
      <NavBar />
      <Header />
      <Illustration src="img/Wave Shape 1.svg" isWave={true} />
      <main className="theme-color bg-gradient-to-b from-bodyPrimary to-bodySecondary pb-20">
        <div className="2xl:w-big-screen 2xl:mx-auto">
          <Quote author="Jason Gore" organization="Microsoft Loop">
            Finally a task runner that
            <span className="text-point"> truly understands</span> the structure
            of my workspaces!
          </Quote>

          <TwoColumns imageOnTop={false} imageFirst={true}>
            <Illustration src="img/frog-skip0.png" isWave={false} />
            <div>
              <Point>Seriously, never build more than once</Point>
              <Description>
                Building once is painful enough! Lage will remember what is done
                before and skip any work that is not needed. Lage even skips the
                work based on your changes… really!
              </Description>
              <div className="hidden md:block">
                <Highlight>
                  It's not just you. Lage will skip work if others already did
                  it too!
                </Highlight>
              </div>
            </div>
          </TwoColumns>

          <div className="md:hidden">
            <Highlight>
              Visualize your build graphs with Lage's suite of tools.
            </Highlight>
          </div>

          <Quote
            author="Brandon Thomas"
            organization="Microsoft 365 Admin Design System"
          >
            With Lage, we've been able to parallelize our builds and use cache
            to reduce CI time from about 40 minutes to
            <span className="text-point"> five minutes.</span>
          </Quote>

          <TwoColumns imageOnTop={false} imageFirst={false}>
            <div>
              <Point>Speeding up your repo takes no time</Point>
              <Description>
                Lage is simple to setup and works everywhere. It just takes a
                minute, seriously!
              </Description>
              <div className="hidden md:block">
                <Highlight>Use one of our clouds, or bring your own!</Highlight>
              </div>
            </div>
            <Illustration src="img/frog-cloud0.png" isWave={false} />
          </TwoColumns>

          <div className="md:hidden">
            <Highlight>Use one of our clouds, or bring your own!</Highlight>
          </div>

          <Quote author="Jason Gore" organization="Microsoft Loop">
            Lage upends the notion that monorepo builds have to be linear and
            sequential, [it] leverages{" "}
            <span className="text-point">modern processing power</span> and is
            incredibly powerful and configurable.
          </Quote>

          <TwoColumns imageOnTop={false} imageFirst={true}>
            <Illustration src="img/frog-hero0.png" isWave={false} />
            <div>
              <Point>Discover what is slowing you down</Point>
              <Description>
                With the built-in profiler, Lage will let you see exactly where
                the bottlenecks are. Yes, you can be the hero of your team.
              </Description>
              <div className="hidden md:block">
                <Highlight>
                  Visualize your build graphs with Lage's suite of tools.
                </Highlight>
              </div>
            </div>
          </TwoColumns>

          <div className="md:hidden">
            <Highlight>
              Visualize your build graphs with Lage's suite of tools.
            </Highlight>
          </div>
        </div>
      </main>
      <Illustration src="img/Wave Shape 2.svg" isWave={true} />
      <Footer />
    </div>
  );
}
