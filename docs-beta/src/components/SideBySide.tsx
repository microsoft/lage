import React from "react";

export default function SideBySide({ children }) {
  return (
    <div className="flex mx-12">
      {React.Children.map(children, (child, i) => {
        if (i < 1) return <div>{child}</div>;
        return <div className="ml-4">{child}</div>;
      })}
    </div>
  );
}
