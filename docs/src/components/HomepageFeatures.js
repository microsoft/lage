import React from 'react';
import clsx from 'clsx';
import "../css/tail.css";

const FeatureList = [
  {
    title: 'Workspace Agnostic',
    Svg: require('../../static/img/icon-business-automation.svg').default,
    description: (
      <>
        This task runner will run npm scripts for all workspace implementations out there: lerna, yarn, pnpm, and rush
      </>
    ),
  },
  {
    title: 'Simple pipeline definition',
    Svg: require('../../static/img/icon-clock-time.svg').default,
    description: (
      <>
        With a terse definition language, get going with builds within a few seconds
      </>
    ),
  },
  {
    title: 'Speedy local incremental builds',
    Svg: require('../../static/img/icon-up.svg').default,
    description: (
      <>
        Because building once is painful enough, lage will remember what you've built before and skip steps that it has already performed before
      </>
    ),
  },
  {
    title: 'Speedy CI build caches',
    Svg: require('../../static/img/icon-monitor-graph-growth.svg').default,
    description: (
      <>
        Based on the `backfill` utility, build output can be cached into the cloud for speedy CI builds as well
      </>
    ),
  },
  {
    title: 'Scoped task runs',
    Svg: require('../../static/img/icon-hierarchy.svg').default,
    description: (
      <>
        Easily run npm tasks by specifying a scope of packages
      </>
    ),
  },
  {
    title: 'Profile the task runners',
    Svg: require('../../static/img/icon-business-chart.svg').default,
    description: (
      <>
        Generate a profile of tasks run by lage - import it inside Chrome or Edge to understand which tasks took the longest time
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div class="items-center">
        <Svg class="fill-blue-300 h-20 w-20 flex justify-center mx-auto pt-3" alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3 class="font-bold text-black text-2xl py-2">{title}</h3>
        <p class="text-black">{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
