function withOpacityValue(variable) {
  return ({ opacityValue }) => {
    if (opacityValue === undefined) {
      return `rgb(var(${variable}))`
    }
    return `rgb(var(${variable}) / ${opacityValue})`
  }
}
module.exports = {
    content: ["./src/pages/*.js","./src/components/*.js"],
    theme: {
      extend: {
        colors: {
          'primary': withOpacityValue('--color-primary'),
          'secondary': withOpacityValue('--color-secondary'),
          'tertiary': withOpacityValue('--color-tertiary'),
          'brand': withOpacityValue('--color-brand'),
          'accent': withOpacityValue('--color-accent'),
        }
      }, 
    },
    plugins: [],
  }