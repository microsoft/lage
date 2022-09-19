import "../css/tailwind.css";
import { Description } from "../components/home/Description";
import { Highlight } from "../components/home/Highlight";
import { Illustration } from "../components/home/Illustration";
import { Point } from "../components/home/Point";
import { Quote } from "../components/home/Quote";
import { Section } from "../components/home/Section";
import { TwoColumns } from "../components/home/TwoColumns";
import { WaveDivider } from "../components/home/WaveDivider";
import { Footer } from "../components/home/Footer";
import { Header } from "../components/home/Header";
import { NavBar } from "../components/navbar/NavBar";
import React from "react";

export default function Home() {
  return (
    <div className="theme-color bg-bodySecondary" id="tailwind">
      <NavBar />
      <Section>
        <Header />
      </Section>
      <WaveDivider />
      <main className="theme-color bg-gradient-to-b from-bodyPrimary to-bodySecondary pb-20 md:mx-auto">
        <Section>
          <Quote author="Jason Gore" organization="Microsoft Loop">
            Finally a task runner that
            <span className="text-point"> truly understands</span> the structure of my workspaces!
          </Quote>
        </Section>

        <Section>
          <TwoColumns imageOnTop={false} imageFirst={true}>
            <Illustration src="img/frog-skip0.png" />
            <div>
              <Point>Seriously, never build more than once</Point>
              <Description>
                Building once is painful enough! Lage will remember what is done before and skip any work that is not needed. Lage even
                skips the work based on your changes… really!
              </Description>
              <div className="hidden md:block">
                <Highlight>It's not just you. Lage will skip work if others already did it too!</Highlight>
              </div>
            </div>
          </TwoColumns>
        </Section>

        <Section>
          <Quote author="Brandon Thomas" organization="Microsoft 365 Admin Design System">
            With Lage, we've been able to parallelize our builds and use cache to reduce CI time from about 40 minutes to
            <span className="text-point"> five minutes.</span>
          </Quote>
        </Section>

        <Section>
          <TwoColumns imageOnTop={false} imageFirst={false}>
            <div>
              <Point>Speeding up your repo takes no time</Point>
              <Description>Lage is simple to setup and works everywhere. It just takes a minute, seriously!</Description>
              <div className="hidden md:block">
                <Highlight>Use one of our clouds, or bring your own!</Highlight>
              </div>
            </div>
            <Illustration src="img/frog-cloud0.png" />
          </TwoColumns>
        </Section>

        <Section>
          <div className="md:hidden">
            <Highlight>Use one of our clouds, or bring your own!</Highlight>
          </div>
        </Section>

        <Section>
          <Quote author="Jason Gore" organization="Microsoft Loop">
            Lage upends the notion that monorepo builds have to be linear and sequential, [it] leverages{" "}
            <span className="text-point">modern processing power</span> and is incredibly powerful and configurable.
          </Quote>
        </Section>

        <Section>
          <TwoColumns imageOnTop={false} imageFirst={true}>
            <Illustration src="img/frog-hero0.png" />
            <div>
              <Point>Discover what is slowing you down</Point>
              <Description>
                With the built-in profiler, Lage will let you see exactly where the bottlenecks are. Yes, you can be the hero of your team.
              </Description>
              <div className="hidden md:block">
                <Highlight>Visualize your build graphs with Lage's suite of tools.</Highlight>
              </div>
            </div>
          </TwoColumns>
        </Section>

        <Section>
          <div className="md:hidden">
            <Highlight>Visualize your build graphs with Lage's suite of tools.</Highlight>
          </div>
        </Section>
      </main>
      <WaveDivider />
      <Footer />
    </div>
  );
}
