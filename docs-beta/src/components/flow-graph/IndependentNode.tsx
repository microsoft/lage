import React, { memo } from 'react';
export default memo(( data ) => {
  return (
    <>
      <div className="center">
        {data["label"]}
      </div>
    </>
  );
});
