import React from "react";

export const Command = (props) => {
  return (
    <p className="font-bahnschrift text-primary text-center whitespace-pre-wrap mx-12 my-8 w-36 bg-body-gradient text-2xl">
      {props.children}
    </p>
  );
}