import React from "react";

export const HeaderTitle = (props) => {
  return (
    <p className="font-londrina font-extrabold text-8xl px-12 pb-4 pt-12 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-point">
      {props.children}
    </p>
  );
}
