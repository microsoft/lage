import { Transform } from "stream";
import { END_MARKER_PREFIX, START_MARKER_PREFIX } from "./stdioStreamMarkers.js";

export function createFilteredStreamTransform(): Transform {
  const startMarkerRegexp = new RegExp(START_MARKER_PREFIX + "[0-9a-z]{64}\n");
  const endMarkerRegexp = new RegExp(END_MARKER_PREFIX + "[0-9a-z]{64}\n");
  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      let str = chunk.toString();

      if (str.includes(START_MARKER_PREFIX)) {
        str = str.replace(startMarkerRegexp, "");
      }

      if (str.includes(END_MARKER_PREFIX)) {
        str = str.replace(endMarkerRegexp, "");
      }

      callback(null, str);
    },
  });

  return transform;
}
