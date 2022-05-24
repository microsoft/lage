import React from 'react';
import clsx from 'clsx';
import "../css/tail.css";
import Link from '@docusaurus/Link';

const MoreList = [
  {
    title: "What's under the hood",
    description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra",
    buttonTitle: "See how it works",
    buttonTo: "/docs/Introducing Lage/Overview",
  },
  {
    title: "A different kind of monorepo",
    description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra",
    buttonTitle: "Comparison chart",
    buttonTo: "/docs/Introducing Lage/Overview",
  },
  {
    title: "Something else goes here",
    description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra",
    buttonTitle: "Mysterious button",
    buttonTo: "/docs/Introducing Lage/Overview",
  },
];

function More({title, description, buttonTitle, buttonTo}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <h3 class="font-bold text-black text-2xl pt-12">{title}</h3>
        <p class="text-black whitespace-pre-wrap py-4">{description}</p>
      </div>
      <div class="text-center">
      <Link
      class="bg-zinc-200 hover:bg-blue-800 hover:text-white hover:no-underline text-black text-lg font-bold py-2 px-4 rounded"
      to={buttonTo}>
      {buttonTitle}
      </Link>
      </div>
    </div>
  );
}

export default function SeeMore() {
  return (
    <section>
      <div className="container">
        <div className="row">
          {MoreList.map((props, idx) => (
            <More key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
