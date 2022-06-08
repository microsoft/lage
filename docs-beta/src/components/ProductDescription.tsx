import React from "react";

export default function ProductDescription({children}) {
  return (
    <p className="font-bahnschrift text-primary text-3xl px-12 mb-4">
      {children}
    </p>
  );
}
