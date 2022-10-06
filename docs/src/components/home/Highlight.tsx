import React from "react";

export const Highlight = (props) => {
  return (
    <div className="flex justify-center items-center h-20 bg-white my-4 mx-4 md:mx-8 rounded-r-full rounded-l-full font-bahnschrift">
      <p className="font-bold text-lg text-bodySecondary px-4 my-0 py-0">{props.children}</p>
    </div>
  );
};
