import React from "react";

export const TwoColumns = (props) => {
  return (
    <div className="mx-auto">
      <div className="flex items-center md:hidden">
        {props.imageOnTop && props.imageFirst && (
          <div>
            <>
              {React.Children.map(
                props.children,
                (child, i) => i === 0 && child
              )}
            </>
            <>
              {React.Children.map(
                props.children,
                (child, i) => i === 1 && child
              )}
            </>
          </div>
        )}
        {props.imageOnTop && !props.imageFirst && (
          <div>
            <>
              {React.Children.map(
                props.children,
                (child, i) => i === 1 && child
              )}
            </>
            <>
              {React.Children.map(
                props.children,
                (child, i) => i === 0 && child
              )}
            </>
          </div>
        )}
        {!props.imageOnTop && props.imageFirst && (
          <div>
            <>
              {React.Children.map(
                props.children,
                (child, i) => i === 1 && child
              )}
            </>
            <>
              {React.Children.map(
                props.children,
                (child, i) => i === 0 && child
              )}
            </>
          </div>
        )}

        {!props.imageOnTop && !props.imageFirst && (
          <div>
            <>
              {React.Children.map(
                props.children,
                (child, i) => i === 0 && child
              )}
            </>
            <>
              {React.Children.map(
                props.children,
                (child, i) => i === 1 && child
              )}
            </>
          </div>
        )}
      </div>

      <div className="grid hidden mx-12 md:flex md:items-center md:grid-cols-2">
        {React.Children.map(props.children, (child, i) => {
          if (i < 2) return <div className="flex align-center">{child}</div>;
          else return;
        })}
      </div>
    </div>
  );
};
