import React from 'react';

export default function TwoColumns({children}) {
    return (
        <div className="mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        {React.Children.map(children, (child, i) => {
            if (i < 2) return <div className="flex float-left py-4 align-center">{child}</div>
            else return
            })}
        </div>
        </div>
    );
}
