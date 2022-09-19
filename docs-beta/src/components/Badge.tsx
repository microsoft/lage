import React from "react";

export const Badge = (props: { children: React.ReactNode }) => {
  const { children } = props;
  return (
    <span className="inline-block px-3 py-1 text-xs font-semibold leading-tight text-gray-800 bg-gray-200 rounded-full mb-8">{children}</span>
  );
};
