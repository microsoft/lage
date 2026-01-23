// @ts-expect-error
import _gradient from "gradient-string";

/** Wrapper for `gradient-string` to fix the lack of types */
export const gradient = _gradient as (color: { r: number; g: number; b: number }, secondColor: string) => (str: string) => string;
