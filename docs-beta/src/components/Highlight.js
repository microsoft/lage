import React from 'react';
import "../css/tailwind-styles.css"; 

export const Highlight=(props) => {
    const highlightStyle=`flex items-center w-full h-20 bg-gray-300 my-36 ${props.toLeft ? 'rounded-r-full justify-end' : 'rounded-l-full justify-start'}`;
    const circleStyle=`absolute w-16 h-16 bg-gray-400 rounded-r-full rounded-l-full ${props.toLeft ? 'mr-4' : 'ml-4'}`;
    const textStyle=`font-bahnschrift font-bold text-lg text-body ${props.toLeft ? 'mr-24 ml-4' : 'ml-24 mr-4'}`;
    return (
        <div>
        <div className={highlightStyle}>
            <div className={circleStyle}/>
            <p className={textStyle}>{props.content}</p>
            </div>
        </div>
    );
}