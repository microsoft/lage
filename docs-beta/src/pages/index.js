import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Features from '../components/Features';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TwoColumns from '../components/TwoColumns';
import { Tweet } from '../components/Tweet';
import '../css/tailwind-styles.css';
import Testimonials from '../components/Testimonials';
import Table from '../components/Table';

export default function Home() {
  const {siteConfig}=useDocusaurusContext();  
  return ( 
    <Layout>
      <Header/> 
      <main className="bg-primary">
        <TwoColumns>
          <div className="text-left">
            <h1 className ="point">Finally! Your days of <br/>suffering are over</h1>
            <p className ="para">Explain the problem that Lage solves here. No jargon! Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio quisco.</p>
            <Tweet toLeft={true} 
                   tweetContent='"Where have you been all my life?! Lage if you were a person I would propose to you YESTERDAY"'
                   author="@devs_for_days89"/>
          </div>
          <div>
            <img class="mx-auto mt-3 px-12" src="http://placekitten.com/600/600"/>
          </div>
        </TwoColumns>

        <TwoColumns className="mt-16">
          <div>
            <img class="mx-auto mt-3 px-12" src="http://placekitten.com/600/600"/>
          </div>
          <div className="text-right justify-end">
            <h1 className="point">Here is what Lage does the best.</h1>
            <p className="para">Show off the absolute BEST benefit of Lage. Does it make your life easier? Will you be more popular? Most handsome person alive? Tap into that empathy and ask yourself, how will this make my customer FEEL? Address that! Don’t worry about the 2nd and 3rd benefits. We’ll get there. Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros.</p>
            <Features /> 
            <Tweet toLeft={false} 
                   tweetContent='"I would like to thank my parents, my friends, and Lage for making me the individual I am today."'
                   author="@bobthebuilder_msft"/>
          </div>
        </TwoColumns>

        <p className="point">What's a monorepo?</p>
        <p className ="para">Monorepos are beautiful. That's all we need to know. Could I BE loving monorepos more? Monorepos are beautiful. That's all we need to know. Could I BE loving monorepos more?  Monorepos are beautiful. That's all we need to know. Could I BE loving monorepos more?  Monorepos are beautiful. That's all we need to know. Could I BE loving monorepos more? Monorepos are beautiful. That's all we need to know. Could I BE loving monorepos more?  </p>
        <div className="flex pt-12 justify-center">
          <Table/>
        </div>

        <p className="point">Precious time saved by Lage since 2019</p>
        <p className ="para">Estimated based on the feedback of 50,000 creators.</p>
        <p className="para"> The illustration goes here</p>

        <p className="point py-12 text-center">What would you do with the time saved by Lage?</p>
        <Testimonials/>
      </main>
      <Footer/>
    </Layout> 
  );
}