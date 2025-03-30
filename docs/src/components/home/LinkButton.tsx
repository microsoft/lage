import React from "react";
import Link from "@docusaurus/Link";
import { cx, classNames } from "../classNames";

export const LinkButton = (props: React.PropsWithChildren<{ to: string }>) => {
  const buttonClass = cx(
    classNames.fontSm,
    classNames.roundedBox,
    "inline-block py-2 md:py-3 px-4 md:px-6 bg-white font-bold"
  );
  return (
    <Link className={buttonClass} to={props.to}>
      {props.children}
    </Link>
  );
};
