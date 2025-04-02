import Link from "@docusaurus/Link";
import React from "react";
import { ToolList, type ToolInfo } from "../../data/ToolList";
import { cx, classNames } from "../classNames";

const Tool = (props: ToolInfo) => {
  const { svg: Svg, title, description, link } = props;
  return (
    <div
      className={cx(
        classNames.roundedBox,
        "max-w-sm flex flex-col items-stretch p-6 bg-tealXDark"
      )}
    >
      <Link
        href={link}
        target="_blank"
        className={cx(
          "text-white! underline-offset-4 flex flex-col items-center gap-3 md:gap-4 mb-3 md:mb-4",
          classNames.fontMdLg
        )}
      >
        <Svg className="h-12 w-12 md:h-16 md:w-16" aria-hidden />
        {title}
      </Link>
      <p className={classNames.fontSm}>{description}</p>
    </div>
  );
};

export const Tools = () => {
  return (
    <div className="grid px-4 gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {ToolList.map((props) => (
        <Tool key={props.title} {...props} />
      ))}
    </div>
  );
};
