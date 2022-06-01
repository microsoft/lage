import React from 'react';
import "../css/tailwind-styles.css"; 

export const FeatureList=[
  {
    title: 'Simple pipeline definition',
    Svg: require('../../static/img/icon-clock-time.svg').default,
  },
  {
    title: 'Speedy local incremental builds',
    Svg: require('../../static/img/icon-up.svg').default,
  },
  {
    title: 'Scoped task runs',
    Svg: require('../../static/img/icon-hierarchy.svg').default,
  },
];

function Feature({Svg, title}) {
  return (
    <div className="text--center padding-horiz--md">
      <div className="items-center">
        <Svg className="fill-blue-300 h-16 w-16 flex justify-center mx-auto pt-3" alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <p className="featureText">{title}</p>
      </div>
    </div>
  );
}

export default function Features() {
  return (
      <div className="grid grid-cols-3 my-4">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
      </div>
  );
}
