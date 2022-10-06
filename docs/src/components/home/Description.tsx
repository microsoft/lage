import React from "react";

export const Description = (props) => {
  return <p className="font-bahnschrift text-primary whitespace-pre-wrap py-4 text-lg md:text-2xl px-12">{props.children}</p>;
};
