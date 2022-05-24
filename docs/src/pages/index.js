import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import '../css/tail.css';
import HomepageFeatures from '../components/HomepageFeatures';
import SeeMore from '../components/SeeMore';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header class="bg-orange-600 pb-12">
      <p class="text-white text-6xl px-12 py-4">Catchy slogan that <br></br>makes you smile</p>
      <p class="text-white text-3xl px-12 pb-4">A big idea that hints there is <br></br>something you really want here</p>
      <Link
        class="ml-12 display inline-block bg-zinc-200 hover:bg-blue-800 hover:text-white hover:no-underline text-black text-lg font-bold py-2 px-4 rounded"
        to="/docs/Introducing Lage/Overview">
        Get Started
      </Link>
      <Link
        class="ml-4 display inline-block bg-zinc-200 hover:bg-blue-800 hover:text-white hover:no-underline text-black text-lg font-bold py-2 px-4 rounded"
        to="/docs/Introducing Lage/Overview">
        Try the Demo
      </Link>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return ( 
    <Layout>

      <HomepageHeader /> {/*Lage Intro*/}

      <main class="bg-white">
        <div class="pl-12"> {/*Problem Statement*/}
          <h1 class="font-bold text-black text-4xl pt-12 lg:w-1/2 md:w-1/2">Finally! Your days of <br></br>suffering are over</h1>
          <p class="text-black whitespace-pre-wrap pt-4 lg:w-1/2 md:w-1/2 mr-12">Explain the problem that Lage solves here. No jargon! Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio quisco.</p>
        </div>

        <div class="flex mt-16"> {/*Lage's Best Feature*/}
          <div class="lg:w-1/2 md:w-1/2"></div>
          <div class="lg:w-1/2 md:w-1/2 text-right justify-end pr-12">
            <h1 class="font-bold text-black text-4xl pt-12">Here is what Lage does the best.</h1>
            <p class="text-black whitespace-pre-wrap pt-4 pb-12 ml-12">Show off the absolute BEST benefit of Lage. Does it make your life easier? Will you be more popular? Most handsome person alive? Tap into that empathy and ask yourself, how will this make my customer FEEL? Address that! Don’t worry about the 2nd and 3rd benefits. We’ll get there. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros.</p>
          </div>
        </div>

        <HomepageFeatures /> {/*Lage's Other Features*/}

        <div class="pl-12"> {/*Testimonials*/}
          <h1 class="font-bold text-black text-4xl pt-12 lg:w-1/2 md:w-1/2">Lage powers over a <br></br>gajillion projects</h1>
          <p class="text-black whitespace-pre-wrap pt-4 lg:w-1/2 md:w-1/2 mr-12">Including those from NAME DROP NAME DROP NAME DROP NAME DROP NAME DROP NAME DROP NAME DROP NAME DROP NAME DROP. You can do so many things with it!</p>
        </div>

        <SeeMore /> {/*See More*/}

        <div class="bg-orange-600 pb-12 mt-16"> {/*Footer*/}
          <h1 class="font-bold text-white text-4xl px-12 py-4">Enough stalling! Get started right now!</h1>
          <p class="text-white whitespace-pre-wrap py-4 px-12">Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra.Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra.Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra. </p>
          <Link
            class="ml-12 display inline-block bg-zinc-200 hover:bg-blue-800 hover:text-white hover:no-underline text-black text-lg font-bold py-2 px-4 rounded"
            to="/docs/Introducing Lage/Overview">
            Get Started
         </Link>
          <Link
            class="ml-4 display inline-block bg-zinc-200 hover:bg-blue-800 hover:text-white hover:no-underline text-black text-lg font-bold py-2 px-4 rounded"
            to="/docs/Introducing Lage/Overview">
            Try the Demo
          </Link>
        </div>
      </main>
    </Layout> 
  );
}