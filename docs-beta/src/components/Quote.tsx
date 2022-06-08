import React from "react";

export const Quote = (props) => {
  return (
    <div className="h-screen flex flex-col justify-center items-center font-bahnschrift text-primary whitespace-pre-wrap text-3xl md:px-24 lg:px-48">
      <div>
        <p className="w-3/4 mx-auto">{props.children}</p>
        <p className="w-3/4 mx-auto">—{props.author}, {props.organization}</p>
      </div>
    </div>
  );
}