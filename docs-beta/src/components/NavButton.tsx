import React from "react";
import Link from "@docusaurus/Link";

export const NavButton = (props) => {
  return (
    <Link className="font-bahnschrift inline-block py-4 px-4 rounded hover:no-underline font-bold text-lg text-white" to={props.to}>
      {props.children}
    </Link>
  );
}
