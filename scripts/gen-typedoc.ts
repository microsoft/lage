import * as TypeDoc from "typedoc";
import path from "path";
import { getType } from "./reflection/getType";
import { writeFileSync, readFileSync } from "fs";

function relative(p: string) {
  return path.resolve(__dirname, "..", p);
}

const app = new TypeDoc.Application();

// If you want TypeDoc to load tsconfig.json / typedoc.json files
app.options.addReader(new TypeDoc.TSConfigReader());
app.options.addReader(new TypeDoc.TypeDocReader());

app.bootstrap({
  mode: "modules",
  logger: "none",
  target: TypeDoc.TypeScript.ScriptTarget.ES5,
  module: TypeDoc.TypeScript.ModuleKind.CommonJS,
  experimentalDecorators: true,
});

writeMarkdown("docs/guide/config.md", "ConfigOptions");
writeMarkdown("docs/guide/cli.md", "CliOptions");

function writeMarkdown(file: string, typeName: string) {
  const project = app.convert(
    app.expandInputFiles([relative(`src/types/${typeName}.ts`)])
  );

  let buffer = "";
  if (project) {
    for (const node of project.children) {
      buffer = buffer + getType(node);
    }
  }

  const contents = readFileSync(file, "utf-8");

  const lines = contents.split(/\r?\n/);
  const index =
    lines.findIndex((line) => line.trim().startsWith(`## Options`)) || 0;
  const newContent = lines.slice(0, index).join("\n");

  writeFileSync(file, newContent + "\n## Options\n\n" + buffer);
}
