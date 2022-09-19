import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import "../css/tailwind.css";

export default function Test() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <div className="theme-color" id="tailwind">
      <div className="md:bg-navbar">test</div>
    </div>
  );
}
