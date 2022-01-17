import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Works with all workspace implementations',
    Svg: require('../../static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        The workspace-agnostic task runner will run npm scripts for all workspace implementations out there: lerna, yarn, pnpm, and rush
      </>
    ),
  },
  {
    title: 'Simple pipeline definition',
    Svg: require('../../static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        With a terse definition language, get going with builds within a few seconds
      </>
    ),
  },
  {
    title: 'Speedy local incremental builds',
    Svg: require('../../static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Because building once is painful enough, lage will remember what you've built before and skip steps that it has already performed before
      </>
    ),
  },
  {
    title: 'Speedy CI build caches',
    Svg: require('../../static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Based on the `backfill` utility, build output can be cached into the cloud for speedy CI builds as well
      </>
    ),
  },
  {
    title: 'Scoped task runs',
    Svg: require('../../static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Easily run npm tasks by specifying a scope of packages
      </>
    ),
  },
  {
    title: 'Profile the task runners',
    Svg: require('../../static/img/undraw_docusaurus_tree.svg').default,
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
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
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
