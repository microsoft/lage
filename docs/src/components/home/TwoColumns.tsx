import React from "react";

export const TwoColumns = (props) => {
  return (
    <div>
      <div className="flex items-center md:hidden">
        {props.imageOnTop && props.imageFirst && (
          <div>
            <>{React.Children.map(props.children, (child, i) => i === 0 && child)}</>
            <>{React.Children.map(props.children, (child, i) => i === 1 && child)}</>
          </div>
        )}
        {props.imageOnTop && !props.imageFirst && (
          <div>
            <>{React.Children.map(props.children, (child, i) => i === 1 && child)}</>
            <>{React.Children.map(props.children, (child, i) => i === 0 && child)}</>
          </div>
        )}
        {!props.imageOnTop && props.imageFirst && (
          <div>
            <>{React.Children.map(props.children, (child, i) => i === 1 && child)}</>
            <>{React.Children.map(props.children, (child, i) => i === 0 && child)}</>
          </div>
        )}

        {!props.imageOnTop && !props.imageFirst && (
          <div>
            <>{React.Children.map(props.children, (child, i) => i === 0 && child)}</>
            <>{React.Children.map(props.children, (child, i) => i === 1 && child)}</>
          </div>
        )}
      </div>

      <div className="hidden mx-12 md:flex md:flex-row md:items-center md:">
        {React.Children.map(props.children, (child, i) => {
          if (i < 2) return <div className="w-1/2">{child}</div>;
          else return;
        })}
      </div>
    </div>
  );
};
