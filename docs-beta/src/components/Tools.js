import React from 'react';
import "../css/tailwind-styles.css"; 

export const ToolList=[
  {
    title: 'Docusaurus',
    Svg: require('../../static/img/icon-clock-time.svg').default,
    description: "This is what it does. We were inspired to create something even better by using them.",
  },
  {
    title: 'Beachball',
    Svg: require('../../static/img/icon-up.svg').default,
    description: "This is what it does. We were inspired to create something even better by using them.",
  },
  {
    title: 'Backfill',
    Svg: require('../../static/img/icon-hierarchy.svg').default,
    description: "This is what it does. We were inspired to create something even better by using them.",
  },
  {
    title: 'P-graph',
    Svg: require('../../static/img/icon-hierarchy.svg').default,
    description: "This is what it does. We were inspired to create something even better by using them.",
  },
];

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

