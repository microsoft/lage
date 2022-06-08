import React from "react";

export const Quote = (props) => {
  return (
    <div className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 pb-24 text-3xl px-12 md:px-24 lg:px-48">
      <p>{props.children}</p>
      <p>—{props.author}, {props.organization}</p>
    </div>
  );
}