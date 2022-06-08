import React from "react";

export const ProductDescription = (props) => {
  return (
    <p className="font-bahnschrift text-primary text-3xl px-12 mb-4">
      {props.children}
    </p>
  );
}
