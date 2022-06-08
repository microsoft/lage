import React from "react";

export default function Description({children}) {
  return (
    <p className="font-bahnschrift text-primary whitespace-pre-wrap pt-4 text-lg px-12">{children}</p>
  );
}
