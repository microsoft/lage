import React from "react";

export default function HeaderTitle({children}) {
  return (
    <p className="font-londrina font-extrabold text-6xl px-12 pb-4 pt-12 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-point">
      {children}
    </p>
  );
}
