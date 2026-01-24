import justSvg from "../../static/img/just.svg";
import beachballSvg from "../../static/img/beachball1.svg";
import backfillSvg from "../../static/img/backfill.svg";
import pGraphSvg from "../../static/img/p-chart.svg";

export interface ToolInfo {
  title: string;
  svg: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  description: string;
  link: string;
}

export const ToolList: ToolInfo[] = [
  {
    title: "Beachball",
    svg: beachballSvg,
    description:
      "The sunniest semantic version bumper. Makes automating npm publishing a breeze.",
    link: "https://github.com/microsoft/beachball",
  },
  {
    title: "Just ___",
    svg: justSvg,
    description:
      "The task library that just works. Use to build, test, and lint your frontend projects.",
    link: "https://github.com/microsoft/just",
  },
  {
    title: "Backfill",
    svg: backfillSvg,
    description:
      "A JavaScript caching library for reducing build time. Used internally by Lage.",
    link: "https://github.com/microsoft/backfill",
  },
  {
    title: "p-graph",
    svg: pGraphSvg,
    description: "Run a promise graph with concurrency control.",
    link: "https://github.com/microsoft/p-graph",
  },
];
