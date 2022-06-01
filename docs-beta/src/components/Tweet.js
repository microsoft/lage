import React from 'react';

export const Tweet=(props) => {
    const tweetStyle=`py-2 text-primary font-bold whitespace-pre-wrap text-lg ${props.toLeft ? 'ml-32 mr-8' : 'ml-8 mr-32'}`;
    const aligner=`${props.toLeft ? '' : 'w-1/12'}`;
    return (
        <div className='flex'>
            <div className={aligner}/>
            <div className="bg-tertiary w-11/12 mt-4">
                <p className={tweetStyle}>{props.tweetContent}</p>
                <p className={tweetStyle}>{props.author}</p>
            </div>
        </div>
    );
}
