import React from "react";

export default function Command({children}) {
  return (
    <p className="font-bahnschrift text-primary text-center whitespace-pre-wrap mx-12 my-4 w-36 bg-body-gradient text-2xl">
      {children}
    </p>
  );
}