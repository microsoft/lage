import React from 'react';
import { ToolList } from '../pages/data/ToolList';

function Tool({Svg, title, description}) {
  return (
    <div className="text--center padding-horiz--md">
      <div className="my-3 p-6 max-w-sm bg-white rounded-lg border border-gray-200 shadow-md">
        <div className="items-center">
          <Svg className="fill-blue-300 h-16 w-16 flex justify-center mx-auto pt-3" alt={title}/>
        </div>
        <div className="text-primary font-bold mt-2 mb-4">{title}</div>
        <p className="mb-3 font-normal text-gray-700 dark:text-primary">{description}</p>
      </div>
    </div>
  );
}

export default function Tools() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gaps-12 md:grid-cols-2">
      {ToolList.map((props, idx) => (
        <Tool key={idx} {...props} />
      ))}
    </div>  
  );
}

