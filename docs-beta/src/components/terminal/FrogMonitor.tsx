import React, { CSSProperties } from "react";
import * as AsciinemaPlayer from "asciinema-player";

export function FrogMonitor() {
  const video = React.useRef<HTMLDivElement>(null);
  const state = React.useRef<AsciinemaPlayer>({ player: undefined });
  const [width, setWidth] = React.useState("100");

  const style: CSSProperties = {
    position: "static",
    display: "block",

    backgroundColor: "red"
  };

  const styleContainer: CSSProperties = { 
    position: "relative", 

    display: "block",
    width: "100%",
    height: "100%",

    backgroundColor: "red"
  } as CSSProperties;

  const styleVideoContainer: CSSProperties = {
    zIndex: 0,
    boxSizing: "border-box",
    padding: "4% 4% 4% 8%",
    position: "absolute",
    marginTop: "15.5%",
    left: "22.5%",
    width: "75%",
    backgroundColor: "rgb(18, 19, 20)",
  };

  const styleImage: CSSProperties = {
    zIndex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
  };

  React.useEffect(() => {
    const divElement = video.current;

    if (divElement) {
      const tmpPlayer = AsciinemaPlayer.create("517403.cast", divElement, {
        cols: 80,
        rows: 22,
      });

      state.current.player = tmpPlayer;

      return () => {
        if (tmpPlayer?.dispose) {
          try {
            tmpPlayer.dispose();
          } catch (e) {}
          if (divElement) {
            divElement.innerHTML = "";
          }
        }
      };
    }
  });

  const playerHandler = () => {
    state.current.player?.play();
  };

  return (
    <div style={style} className="flex-1 w-3/4 h-3/4 md:w-full md:h-full" onClick={() => playerHandler()}>
      <div style={styleContainer}>
        <img src="img/frog-monitor0.png" alt="frog" style={styleImage} key="overlay" />
        <div style={styleVideoContainer}>
          <div key="video" ref={video} id="video" />
        </div>
      </div>
    </div>
  );
}
