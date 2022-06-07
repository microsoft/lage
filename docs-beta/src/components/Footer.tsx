import React from "react";
import Link from "@docusaurus/Link";
import SideBySide from "./SideBySide";
import TwoColumns from "./TwoColumns";
import Tools from "./Tools";
import { styles } from "../css/shared-styles";

export default function Footer() {
  return (
    <div className="theme-color bg-black py-8">
      <TwoColumns>
        <div>
          <img className="mx-12 py-8" src="img/placeholder.png" />
        </div>
        <div>
          <h1 className={styles.footerTitle}>Seeing is believing -- Give Lage a spin</h1>
          <p className={styles.fullLengthPara}>
            There’s no better time than now to save yourself time. Get started within a minute with a single command!{" "}
          </p>
          <p className="font-bahnschrift text-primary text-center whitespace-pre-wrap mx-12 mb-4 w-36 bg-body-2 text-2xl">
            {" "}
            npx lage init{" "}
          </p>
          <SideBySide>
            <Link className={styles.primaryButton} to="/docs/Introducing Lage/Overview">
              Get Started
            </Link>
            <Link className={styles.button} to="/docs/Introducing Lage/Overview">
              Try the Demo
            </Link>
          </SideBySide>
        </div>
      </TwoColumns>

      <p className={styles.footerPoint}> Better Together</p>
      <p className={styles.para}>
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
