import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import React from "react";
import { cx } from "../components/classNames";
import { Quote } from "../components/home/Quote";
import { Section } from "../components/home/Section";
import { Tools } from "../components/home/Tools";
import { WaveDivider } from "../components/home/WaveDivider";
import "../css/tailwind.css";

/**
 * Common tailwind container class (renamed) and padding/margin.
 *
 * Due to the cute wave divider, for any sections which has a background,
 * the background must be applied to a parent element, and this class must be
 * applied to a child element.
 */
const containerClass =
  "homeContainer mx-auto px-12 md:px-16 py-8 md:py-12 lg:py-16";
/** Flex styles for containers with multiple items */
const containerFlexClass = "flex flex-col gap-8 md:gap-16 lg:gap-24";

export default function Home() {
  return (
    <Layout noFooter>
      <div className="bg-tealMd" id="homeRoot">
        <h1 className="sr-only">Lage</h1>
        <Intro className={containerClass} />
        <WaveDivider />
        <div className="bg-linear-to-b from-tealDark to-tealMd">
          <MainContent className={cx(containerClass, containerFlexClass)} />
        </div>
        <WaveDivider />
        <div className="bg-tealDark">
          <Conclusion className={cx(containerClass, containerFlexClass)} />
        </div>
      </div>
    </Layout>
  );
}

function Intro(props: { className: string }) {
  // this is not semantically a header
  return (
    <Section
      heading="Never build the same code twice"
      isMainHeading
      description={
        <>
          Give your monorepo the smarts to <i>actually</i> save you time
        </>
      }
      linkButton={{ to: "/docs/introduction", text: "Get Started" }}
      className={props.className}
      illustrationSrc="img/frog.webm"
      reverseOnXS
    />
  );
}

function MainContent(props: { className: string }) {
  return (
    <div className={props.className}>
      <Quote author="Jason Gore" organization="Microsoft Loop">
        Finally a task runner that{" "}
        <span className="text-gold">truly understands</span> the structure of my
        workspaces!
      </Quote>

      <Section
        heading="Seriously, never build more than once"
        description={
          "Building once is painful enough! Lage will remember what is done " +
          "before and skip any work that is not needed. Lage even skips the work " +
          "based on your changes… really!"
        }
        highlight="It's not just you. Lage will skip work if others already did it too!"
        illustrationSrc="img/frog-skip0.png"
        illustrationFirst
        reverseOnXS
      />

      <Quote
        author="Brandon Thomas"
        organization="Microsoft 365 Admin Design System"
      >
        With Lage, we've been able to parallelize our builds and use cache to
        reduce CI time from about 40 minutes to{" "}
        <span className="text-gold">five minutes.</span>
      </Quote>

      <Section
        heading="Speeding up your repo takes no time"
        description="Lage is simple to set up and works everywhere. It just takes a minute, seriously!"
        highlight={
          <>
            Use a <Link to="/docs/guides/cache">local cache</Link>, or{" "}
            <Link to="/docs/guides/remote-cache">
              bring your own cloud storage
            </Link>
            !
          </>
        }
        illustrationSrc="img/frog-cloud0.png"
      />

      <Quote author="Jason Gore" organization="Microsoft Loop">
        Lage upends the notion that monorepo builds have to be linear and
        sequential; it leverages{" "}
        <span className="text-gold">modern processing power</span> and is
        incredibly powerful and configurable.
      </Quote>

      <Section
        heading="Discover what is slowing you down"
        description={
          "With the built-in profiler, Lage will let you see exactly where the " +
          "bottlenecks are. Yes, you can be the hero of your team."
        }
        highlight={
          <>
            <Link to="/docs/guides/profile">Visualize your build graphs</Link>{" "}
            with Lage's suite of tools.
          </>
        }
        illustrationSrc="img/frog-hero0.png"
        illustrationFirst
        reverseOnXS
      />
    </div>
  );
}

function Conclusion(props: { className: string }) {
  // this is semantically not a footer
  return (
    <div className={props.className}>
      <Section
        heading="Seeing is believing — give Lage a spin"
        description={
          "There’s no better time than now to save yourself time. Get started " +
          "within a minute with a single command!"
        }
        linkButton={{
          to: "/docs/introduction",
          text: "Get Started",
        }}
        illustrationSrc="img/frog-sing0.png"
        illustrationFirst
      />

      <Section
        heading="Better together"
        description="Lage works great on its own, but even better alongside its related tools."
        extra={<Tools />}
      />
    </div>
  );
}
