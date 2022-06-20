import React from "react";
import { ToolList } from "../data/ToolList";

function Tool({ Svg, title, description }) {
  return (
    <div className="text-center padding-horiz--md flex justify-center">
      <div className="my-3 p-6 max-w-sm bg-tool rounded-lg h-72 lg:h-96">
        <Svg
          className="fill-black h-12 w-12 md:h-16 md:w-16 flex justify-center mx-auto my-4"
          alt={title}
        />
        <div className="font-bahnschrift text-white mt-2 mb-4 text-2xl md:text-3xl">
          {title}
        </div>
        <p className="font-bahnschrift mb-3 text-white text-lg md:text-xl">
          {description}
        </p>
      </div>
    </div>
  );
}

export const Tools = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gaps-12 px-12 py-8">
      {ToolList.map((props, idx) => (
        <Tool key={idx} {...props} />
      ))}
    </div>
  );
};
