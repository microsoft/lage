import React from "react";

export const Highlight = (props) => {
  return (
    <div>
      <div className="flex items-center h-20 bg-white mt-4 mx-4 md:mx-8 rounded-r-full rounded-l-full">
        <p className="font-bahnschrift font-bold text-lg text-bodySecondary px-4 mx-auto text-center">
          {props.children}
        </p>
      </div>
    </div>
  );
};
