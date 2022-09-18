import React from "react";

export const Quote = (props) => {
  return (
    <div className="py-24 md:px-24 lg:px-48 font-bahnschrift text-primary whitespace-pre-wrap text-xl md:text-4xl">
      <div>
        <p className="before:content-['“'] before:absolute before:text-6xl before:font-londrina before:-left-8 before:-top-8 relative w-3/4 mx-auto">
          {props.children}
        </p>
        <p className="w-3/4 mx-auto text-lg md:text-2xl">
          —{props.author}, {props.organization}
        </p>
      </div>
    </div>
  );
};
