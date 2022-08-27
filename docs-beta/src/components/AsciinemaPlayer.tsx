import React from "react";
import * as AsciinemaPlayer from "asciinema-player";

export const AsciiPlayer = (props) => {
  const playerRef = React.useRef(null);

  React.useEffect(() => {
    if (playerRef.current) {
      AsciinemaPlayer.create("asciinema/incremental.cast", playerRef.current, { cols: 80, rows: 25 });
    }
  }, [playerRef.current]);
  
  return <div {...props} id="player" ref={playerRef}></div>
};