export const tailwindConfig = `
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#25D366',
            dark: '#128C7E',
          },
          secondary: {
            DEFAULT: '#075E54',
          },
          whatsapp: {
            green: '#25D366',
            'green-dark': '#128C7E',
            teal: '#075E54',
            'light-bg': '#F0F2F5',
            'dark-bg': '#111B21',
            'dark-surface': '#202C33',
          },
        },
      },
    },
  }
</script>
`;