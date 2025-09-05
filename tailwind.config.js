module.exports = {
  prefix: 'tw-',
  safelist: [
    'tw-group',
    'tw-opacity-0',
    'tw-pointer-events-none',
    'tw-transition-opacity',
    'tw-duration-300',
    'tw-group-hover:opacity-100',
    'tw-group-hover:pointer-events-auto',
  ],
  content: [
    './layout/**/*.liquid',
    './templates/**/*.liquid',
    './sections/**/*.liquid',
    './snippets/**/*.liquid',
    './graphene/**/*.sbnhtml',
  ],
  theme: {
    screens: {
      sm: '320px',
      md: '750px',
      lg: '990px',
      xlg: '1440px',
      x2lg: '1920px',
      pageMaxWidth: '1440px',
    },
    extend: {
      fontFamily: {
        heading: 'var(--font-heading-family)',
      },
    },
  },
  plugins: [],
};
