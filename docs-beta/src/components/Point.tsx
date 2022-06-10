import React from "react";

export const Point = (props) => {
  const pointStyle=`font-londrina text-6xl mt-8 px-12 ${props.inFooter ? 'text-white':'text-point'}`;
  return (
    <h1 className={pointStyle}>{props.children}</h1>
  );
}
