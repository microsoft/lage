import React from "react";

export const Quote = (props) => {
  return (
    <div className="md:px-24 lg:px-48 my-12 md:my-24 lg:my-48 font-bahnschrift text-primary whitespace-pre-wrap text-3xl">
      <div>
        <p className="w-3/4 mx-auto">{props.children}</p>
        <p className="w-3/4 mx-auto text-lg">—{props.author}, {props.organization}</p>
      </div>
    </div>
  );
}