import { Transform } from "stream";
import { END_WORKER_STREAM_MARKER, START_WORKER_STREAM_MARKER } from "./stdioStreamMarkers";

export function createFilteredStreamTransform(): Transform {
  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      let str = chunk.toString();

      if (str.includes(START_WORKER_STREAM_MARKER)) {
        str = str.replace(START_WORKER_STREAM_MARKER + '\n', "");
      }

      if (str.includes(END_WORKER_STREAM_MARKER)) {
        str = str.replace(END_WORKER_STREAM_MARKER + '\n', "");
      }

      callback(null, str);
    },
  });

  return transform;
}
