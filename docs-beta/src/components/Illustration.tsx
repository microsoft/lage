import React from "react";

export const Illustration = (props) => {
  const imageStyle = `mx-auto ${
    props.isWave ? "w-full h-full" : "w-3/4 h-3/4 md:w-full md:h-full"
  }`;
  return (
    <div>
      <img className={imageStyle} src={props.src} />
    </div>
  );
};
