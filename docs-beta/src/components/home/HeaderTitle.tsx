import React from "react";

export const HeaderTitle = (props) => {
  return (
    <p className="font-londrina text-4xl md:text-6xl px-12 lg:pb-4 lg:pt-12 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-point">
      {props.children}
    </p>
  );
};
