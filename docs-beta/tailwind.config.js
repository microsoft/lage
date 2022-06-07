function withOpacityValue(variable) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`
    }
    return `rgb(var(${variable}) / ${opacityValue})`
  }
}
module.exports = {
    darkMode: 'class',
    content: ["./src/pages/*.tsx","./src/components/*.tsx", "./src/css/*.tsx",
              "./src/pages/*.ts","./src/components/*.ts", "./src/css/*.ts",],
    theme: {
      extend: {
        fontFamily: {
          londrina: ["Londrina Solid"],
          bahnschrift: ["Bahnschrift"],
        },
        colors: {
          'primary': withOpacityValue('--color-primary'),
          'secondary': withOpacityValue('--color-secondary'),
          'tertiary': withOpacityValue('--color-tertiary'),
          'body': withOpacityValue('--color-body'),
          'body-2': withOpacityValue('--color-body-2'),
          'button': withOpacityValue('--color-button'),
          'point': withOpacityValue('--color-point'),
        }
      }, 
    },
    plugins: [],
  }