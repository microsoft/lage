import React from "react";

export const Illustration = (props) => {
  const imageStyle = `mx-auto ${props.isWave ? "w-full h-full max-h-40" : "w-3/4 h-3/4 md:w-full md:h-full"}`;

  return (
    <div>
      {props.src.endsWith(".mp4") || props.src.endsWith(".webm") ? (
        <video className={imageStyle} src={props.src} autoPlay muted />
      ) : (
        <img className={imageStyle} src={props.src} />
      )}
    </div>
  );
};
