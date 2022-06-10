import React from "react";

export const Placeholder = (props) => { 
  const imageStyle=`${props.inHeader ? 'visible mx-auto py-8 px-3 md:w-full md:h-full' : 'invisible md:visible lg:visible w-0 h-0 md:w-full md:h-full'}`;
  return (
    <div>
       <img className={imageStyle} src={props.src}/>
    </div>
  );
}
