import React from "react";
import Link from "@docusaurus/Link";
import SideBySide from "./SideBySide";
import TwoColumns from "./TwoColumns";
import Tools from "./Tools";
import { styles } from "./shared-styles";

export default function Footer() {
  return (
    <div className="theme-dark bg-brand py-8">
      <TwoColumns>
        <div>
          <img className="mx-12 py-8" src="http://placekitten.com/400/400" />
        </div>
        <div>
          <h1 className={styles.footerTitle}>
            Seeing is believing -- Give Lage a spin
          </h1>
          <p className={styles.fullLengthPara}>
            Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut
            turpis. Suspendisse urna nibh, viverra.Lorem ipsum dolor sit amet,
            consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis
            eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh,
            viverra. Lorem ipsum dolor sit amet, consectetuer adipiscing elit.
            Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut
            turpis. Suspendisse urna nibh, viverra.Lorem ipsum dolor sit amet,
            consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis
            eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh,
            viverra. Lorem ipsum dolor sit amet, consectetuer adipiscing elit.{" "}
          </p>
          <SideBySide>
            <Link
              className={styles.button}
              to="/docs/Introducing Lage/Overview"
            >
              Get Started
            </Link>
            <Link
              className={styles.button}
              to="/docs/Introducing Lage/Overview"
            >
              Try the Demo
            </Link>
          </SideBySide>
        </div>
      </TwoColumns>

      <p className={styles.point}> Better Together</p>
      <p className={styles.para}>
        This is about the other tools that Lage work with. This is about the
        other tools that Lage work with. This is about the other tools that Lage
        work with. This is about the other tools that Lage work with. This is
        about the other tools that Lage work with. This is about the other tools
        that Lage work with. This is about the other tools that Lage work with.
      </p>
      <div className="px-12">
        <Tools />
      </div>
    </div>
  );
}
