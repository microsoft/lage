import { Logger } from "./Logger";
import { NpmLogReporter } from "./reporters/NpmLogReporter";
import { JsonReporter } from "./reporters/JsonReporter";
import { AdoReporter } from "./reporters/AdoReporter";
import { DgmlReporter } from "./reporters/DgmlReporter";
import { LogLevel, Reporter } from "./types";

export interface ReporterOptions {
  logLevel: keyof typeof LogLevel;
  grouped: boolean;
  disp?: {
    [level: string]: string;
  };
  style?: {
    [level: string]: { fg?: string; bg?: string };
  };
  levels?: {
    [level: string]: LogLevel;
  };
}

const reporters: Reporter[] = [];

export function initReporter(type: string, options: ReporterOptions): Reporter {
  let logLevel = LogLevel.warn;

  if (options.logLevel) {
    logLevel = LogLevel[options.logLevel];
  }

  let reporter: Reporter;

  switch (type) {
    case 'json':
      reporter = new JsonReporter({logLevel}));
      break;
    
    default:
      reporter = new NpmLogReporter({logLevel}));
      break;
  }

  reporters.push(reporter);
  return reporter;

  // const reporters: Array<AdoReporter | JsonReporter | NpmLogReporter> = [
  //   config.reporter === "json"
  //     ? new JsonReporter({ logLevel })
  //     : config.reporter === "dgml"
  //     ? new DgmlReporter()
  //     : new NpmLogReporter({
  //         logLevel,
  //         grouped: config.grouped,
  //         npmLoggerOptions: config.loggerOptions,
  //       }),
  // ];

  // if (config.reporter === "adoLog") {
  //   // Will always include NpmLogReporter and add AdoReporter
  //   reporters.push(new AdoReporter());
  // }

  // Logger.reporters = reporters;
  // return reporters;
}
