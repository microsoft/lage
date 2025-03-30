import React from "react";
import { classNames, cx } from "../classNames";
import { LinkButton } from "./LinkButton";

/**
 * Section which usually has an illustration on one side and text (chilren) on the other.
 * By default the text is first. (Can also be used for layout without an illustration.)
 */
export const Section = (props: {
  /** main point/header */
  heading: string;
  /** if true, render as h2 with special styling (otherwise h3) */
  isMainHeading?: boolean;
  /** description text (middle of section) */
  description: React.ReactNode;
  /** highlight bubble text (bottom of section) */
  highlight?: React.ReactNode;
  /** link button (bottom of section) */
  linkButton?: { to: string; text: string };
  /** something else (bottom of section) */
  extra?: React.ReactNode;

  /** Path to the illustration, if one should be shown */
  illustrationSrc?: string;
  /**
   * Put the illustration first. (On small screens where the children are
   * stacked vertically, the display order is reversed.)
   */
  illustrationFirst?: boolean;
  /**
   * On XS screens, the children will be stacked vertically.
   * Set to true to reverse their order in that case.
   */
  reverseOnXS?: boolean;

  className?: string;
}) => {
  const {
    highlight,
    illustrationSrc,
    illustrationFirst,
    isMainHeading,
    linkButton,
  } = props;

  // h2 and h3 each have text styles applied in tailwind.css
  const Heading = isMainHeading ? "h2" : "h3";

  const content = (
    <div className={cx(illustrationSrc && "md:w-1/2")}>
      <Heading
        className={cx(
          !isMainHeading && "lg:w-3/4",
          // get rid of extra space below the letters which throws things off visually
          "mb-[-6px]!"
        )}
      >
        {props.heading}
      </Heading>
      <p
        className={cx(
          "py-6 md:py-8",
          isMainHeading ? classNames.fontMdXl : classNames.fontMd
        )}
      >
        {props.description}
      </p>
      {highlight && (
        <div
          className={cx(
            "bg-white text-center rounded-full px-6 md:px-8 py-2 md:py-4 lg:py-6",
            "font-bold text-tealMd",
            classNames.fontSm
          )}
        >
          {highlight}
        </div>
      )}
      {linkButton && (
        <LinkButton to={linkButton.to}>{linkButton.text}</LinkButton>
      )}
      {props.extra}
    </div>
  );

  const imageProps = {
    src: illustrationSrc,
    className: "w-3/4 h-3/4 md:w-full md:h-full",
    role: "presentation",
  };
  const illustration = illustrationSrc && (
    <div className="md:w-1/2" aria-hidden>
      {illustrationSrc.endsWith(".webm") ? (
        <video {...imageProps} autoPlay muted />
      ) : (
        <img {...imageProps} />
      )}
    </div>
  );

  return (
    <section
      className={cx(
        props.className,
        "flex items-center justify-center md:flex-row gap-8",
        props.reverseOnXS ? "max-sm:flex-col-reverse" : "max-sm:flex-col"
      )}
    >
      {illustrationFirst ? illustration : content}
      {illustrationFirst ? content : illustration}
    </section>
  );
};
