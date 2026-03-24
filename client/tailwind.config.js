export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          orange: '#F7A100',
          dark: '#53241B',
        },
        accent: {
          blue: '#0071B3',
          light: '#478BB3',
        },
        support: {
          yellow: '#F8C463',
          green: '#66BA96',
          light: '#EDEDED',
          gray: '#CCCCCC',
          dark: '#666666',
          bg: '#F5F5F5',
        },
        text: '#333333',
        white: '#FFFFFF',
      }
    },
  },
  plugins: [],
}
