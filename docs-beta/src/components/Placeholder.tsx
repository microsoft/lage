import React from "react";

export const Placeholder = (props) => { 
  const imageStyle=`mx-auto w-3/4 h-3/4 px-3 md:w-full lg:w-full md:h-full lg:h-full ${props.inHeader ? 'visible' : 'invisible md:visible lg:visible'}`;
  return (
    <div>
       <img className={imageStyle} src={props.src}/>
    </div>
  );
}
