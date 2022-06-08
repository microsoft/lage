import React from "react";

export const Point = (props) => {
  const pointStyle=`font-londrina font-bold text-6xl pt-12 px-12 ${props.inFooter ? 'text-white':'text-point'}`;
  return (
    <h1 className={pointStyle}>{props.children}</h1>
  );
}
