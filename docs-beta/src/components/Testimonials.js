import React from 'react';

export const TestimonialList=[
  {
    testimonial: "This is my testimonial. Lage is awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome AWESOME",
    link: "docs/docs/Introducing Lage/Overview.md"
  },
  {
    testimonial: "This is my testimonial. Lage is awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome AWESOME",
    link: "docs/docs/Introducing Lage/Overview.md"
  },
  {
    testimonial: "This is my testimonial. Lage is awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome awesome AWESOME",
    link: "docs/docs/Introducing Lage/Overview.md"
  },
];

function Testimonial({testimonial, link}) {
  return (
      <div className="text--center padding-horiz--md">
        <div className="my-3 p-6 max-w-sm bg-white rounded-lg border border-tertiary">
          <p className="mb-3 font-normal text-primary"> {testimonial} </p>
          <a href={link} className="inline-flex items-center py-2 px-3 text-sm font-medium text-center text-secondary bg-brand rounded-lg hover:bg-accent hover:text-secondary hover:no-underline focus:ring-4">
              Read more
              <svg className="ml-2 -mr-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
          </a>
        </div>
      </div>
  );
}

export default function Testimonials() {
  return (
    <div className="mx-12 mb-12 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gaps-12">
      {TestimonialList.map((props, idx) => (
        <Testimonial key={idx} {...props} />
      ))}
    </div>  
  );
}

 
