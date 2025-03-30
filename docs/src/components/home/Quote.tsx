import React from "react";
import { cx, classNames } from "../classNames";

/** Quote aside, hidden on xs, provides its own padding x */
export const Quote = (
  props: React.PropsWithChildren<{
    author: string;
    organization: string;
  }>
) => {
  // pt-8 is for the big quote mark
  return (
    <aside className="max-sm:hidden pt-8 lg:px-32 xl:px-48">
      <p className={cx(classNames.fontMdXl, "bigQuote w-3/4 mx-auto!")}>
        {props.children}
        <br />
        <span className={cx(classNames.fontSmPlus, "inline-block pt-2")}>
          —{props.author}, {props.organization}
        </span>
      </p>
    </aside>
  );
};
