import React from 'react';

export const TwoColumns = (props) => {
    return (
        <div className="mx-auto md:my-8 lg:my-24">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
            {React.Children.map(props.children, (child, i) => {
                if (i < 2) return <div className="flex items-center justify-center">{child}</div>
                else return
                })}
            </div>
        </div>
    );
}
