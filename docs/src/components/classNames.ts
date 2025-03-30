export function cx(...classNames: (string | boolean | null | undefined)[]) {
  return classNames.filter(Boolean).join(" ");
}

export const classNames = {
  /** rounded corner size for a box (button or tool, not the highlight bubbles) */
  roundedBox: "rounded-lg",

  // text-lg to text-<2xl
  fontSm: "text-s1 md:text-s2 lg:text-s3",
  // // text-xl to text-2xl
  fontSmPlus: "text-s2 md:text-s3 lg:text-s4",
  // text-<2xl to text->2xl
  fontMd: "text-s3 md:text-s4 lg:text-s5",
  // text-2xl to text-3xl
  fontMdLg: "text-s4 md:text-s6 lg:text-s7",
  // text-2xl to text-4xl
  fontMdXl: "text-s4 md:text-s6 lg:text-s8",
} as const; // so the values show in intellisense
