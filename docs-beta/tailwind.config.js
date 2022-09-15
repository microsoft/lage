function withOpacityValue(variable) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`;
    }
    return `rgb(var(${variable}) / ${opacityValue})`;
  };
}
module.exports = {
  corePlugins: {
    preflight: false,
  },
  content: [
    "./src/pages/*.js",
    "./src/pages/**/*.tsx",
    "./src/pages/**/*.ts",
    "./src/pages/**/*.js",
    "./src/components/*.js",
    "./src/components/*.tsx",
    "./src/components/*.ts",
  ],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        londrina: ["Londrina Solid"],
        bahnschrift: ["Bahnschrift"],
      },
      spacing: {
        "big-screen": "1920px",
      },
      colors: {
        button: withOpacityValue("--color-button"),
        point: withOpacityValue("--color-point"),
        bodySecondary: withOpacityValue("--color-bodySecondary"),
        bodyPrimary: withOpacityValue("--color-bodyPrimary"),
        primary: withOpacityValue("--color-primary"),
        secondary: withOpacityValue("--color-secondary"),
        tertiary: withOpacityValue("--color-tertiary"),
        navbar: withOpacityValue("--color-navbar"),
        tool: withOpacityValue("--color-tool"),
      },
    },
  },
  plugins: [],
};
