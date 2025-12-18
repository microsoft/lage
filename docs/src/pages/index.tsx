import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import React from "react";
import { classNames, cx } from "../components/classNames";
import { Quote } from "../components/home/Quote";
import {
  Section,
  SectionDescription,
  SectionHeading,
  SectionHighlight,
} from "../components/home/Section";
import { Tools } from "../components/home/Tools";
import { WaveDivider } from "../components/home/WaveDivider";
import "../css/tailwind.css";

/**
 * Common tailwind container class (renamed), padding and margin, and flex
 * styles for containers with multiple sections.
 *
 * Due to the cute wave divider, for any sections which has a background,
 * the background must be applied to a parent element, and this class must be
 * applied to a child element.
 */
const containerClass =
  "homeContainer mx-auto px-12 md:px-16 xl:px-20 py-8 md:py-12 lg:py-16 " +
  "flex flex-col gap-8 md:gap-16 lg:gap-24";

export default function Home() {
  return (
    <Layout noFooter>
      <div className="bg-tealMd" id="homeRoot">
        <h1 className="sr-only">Lage</h1>
        <div className={containerClass}>
          <Intro />
        </div>
        <WaveDivider />
        <div className="bg-linear-to-b from-tealDark to-tealMd">
          <div className={containerClass}>
            <MainContent />
          </div>
        </div>
        <WaveDivider />
        <div className="bg-tealDark">
          <div className={containerClass}>
            <Conclusion />
          </div>
        </div>
      </div>
    </Layout>
  );
}

const Intro = () => {
  // this is not semantically a header
  return (
    <Section illustrationSrc="img/frog.webm" reverseOnXS>
      <SectionHeading isMainHeading>
        Never build the same code twice
      </SectionHeading>
      <SectionDescription isMainHeading>
        Give your monorepo the smarts to <i>actually</i> save you time
      </SectionDescription>
      <GetStartedLinkButton />
    </Section>
  );
};

const MainContent = () => {
  return (
    <>
      <Quote author="Jason Gore" organization="Microsoft Loop">
        Finally a task runner that{" "}
        <span className="text-gold">truly understands</span> the structure of my
        workspaces!
      </Quote>

      <Section
        illustrationSrc="img/frog-skip0.png"
        illustrationFirst
        reverseOnXS
      >
        <SectionHeading>Seriously, never build more than once</SectionHeading>
        <SectionDescription>
          Building once is painful enough! Lage will remember what is done
          before and skip any work that is not needed. Lage even skips the work
          based on your changes… really!
        </SectionDescription>
        <SectionHighlight>
          It's not just you. Lage will skip work if others already did it too!
        </SectionHighlight>
      </Section>

      <Quote
        author="Brandon Thomas"
        organization="Microsoft 365 Admin Design System"
      >
        With Lage, we've been able to parallelize our builds and use cache to
        reduce CI time from about 40 minutes to{" "}
        <span className="text-gold">five minutes.</span>
      </Quote>

      <Section illustrationSrc="img/frog-cloud0.png">
        <SectionHeading>Speeding up your repo takes no time</SectionHeading>
        <SectionDescription>
          Lage is simple to setup and works everywhere. It just takes a minute,
          seriously!
        </SectionDescription>
        <SectionHighlight>
          Use a <Link to="/docs/guides/cache">local cache</Link>, or{" "}
          <Link to="/docs/guides/remote-cache">
            bring your own cloud storage
          </Link>
          !
        </SectionHighlight>
      </Section>

      <Quote author="Jason Gore" organization="Microsoft Loop">
        Lage upends the notion that monorepo builds have to be linear and
        sequential; it leverages{" "}
        <span className="text-gold">modern processing power</span> and is
        incredibly powerful and configurable.
      </Quote>

      <Section
        illustrationSrc="img/frog-hero0.png"
        illustrationFirst
        reverseOnXS
      >
        <SectionHeading>Discover what is slowing you down</SectionHeading>
        <SectionDescription>
          With the built-in profiler, Lage will let you see exactly where the
          bottlenecks are. Yes, you can be the hero of your team.
        </SectionDescription>
        <SectionHighlight>
          <Link to="/docs/guides/profile">Visualize your build graphs</Link>{" "}
          with Lage's suite of tools.
        </SectionHighlight>
      </Section>
    </>
  );
};

const Conclusion = () => {
  // this is semantically not a footer
  return (
    <>
      <Section illustrationSrc="img/frog-sing0.png" illustrationFirst>
        <SectionHeading>Seeing is believing — give Lage a spin</SectionHeading>
        <SectionDescription>
          There’s no better time than now to save yourself time. Get started
          within a minute with a single command!
        </SectionDescription>
        <GetStartedLinkButton />
      </Section>

      <Section>
        <SectionHeading>Better together</SectionHeading>
        <SectionDescription>
          Lage works great on its own, but even better alongside its related
          tools.
        </SectionDescription>
        <Tools />
      </Section>
    </>
  );
};

/** Get started link that looks like a button */
const GetStartedLinkButton = () => {
  const buttonClass = cx(
    classNames.fontSm,
    classNames.roundedBox,
    "inline-block py-2 md:py-3 px-4 md:px-6 bg-white font-bold",
  );
  return (
    <Link className={buttonClass} to="/docs/introduction">
      Get Started
    </Link>
  );
};
