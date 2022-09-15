import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { TwoColumns } from "../components/TwoColumns";
import { Highlight } from "../components/Highlight";
import { Illustration } from "../components/Illustration";
import { Point } from "../components/Point";
import { Description } from "../components/Description";
import { Quote } from "../components/Quote";
import NavBar from "../components/NavBar";

export default function Test() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <div className="theme-color">
      <div className="h-8 bg-red-100">test</div>
    </div>
  );
}
