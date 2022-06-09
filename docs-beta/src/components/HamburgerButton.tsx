import React from "react";
import Link from "@docusaurus/Link";

export const HamburgerButton = (props) => {
  return (
    <Link className="font-bahnschrift inline-block hover:no-underline hover:text-body text-lg text-black" to={props.to}>
      {props.children}
    </Link>
  );
}
