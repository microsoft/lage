function withOpacityValue(variable) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`;
    }
    return `rgb(var(${variable}) / ${opacityValue})`;
  };
}
module.exports = {
  content: [
    "./src/pages/*.js",
    "./src/components/*.js",
    "./src/pages/*.tsx",
    "./src/pages/*.ts",
    "./src/components/*.tsx",
    "./src/components/*.ts",
  ],
  theme: {
    container: {
      center: true,
    },
    extend: {
      spacing: {
        'big-screen': '1920px',
      },
      colors: {
        primary: withOpacityValue("--color-primary"),
        secondary: withOpacityValue("--color-secondary"),
        tertiary: withOpacityValue("--color-tertiary"),
        brand: withOpacityValue("--color-brand"),
        accent: withOpacityValue("--color-accent"),
      },
    },
  },
  plugins: [],
};
