import React from "react";

export const Description = (props) => {
  return (
    <p className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 text-lg px-12">{props.children}</p>
  );
}
