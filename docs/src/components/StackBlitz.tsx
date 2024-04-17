import * as React from "react";

import stackblitzSdk, { EmbedOptions } from "@stackblitz/sdk";

interface StackBlitzProps extends EmbedOptions {
  githubRepo: string;
}

export const StackBlitz = (props: StackBlitzProps) => {
  const { githubRepo, ...embedOptions } = props;
  const editorRef = React.createRef<HTMLDivElement>();

  React.useEffect(() => {
    if (editorRef.current) {
      stackblitzSdk.embedGithubProject(
        editorRef.current,
        githubRepo,
        embedOptions,
      );
    }
  }, [editorRef.current]);

  return <div ref={editorRef}></div>;
};
