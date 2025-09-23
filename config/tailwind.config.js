/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ceļi uz failiem, kuros Tailwind meklēs izmantotās klases
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',      // visi faili mapē "pages"
    './components/**/*.{js,ts,jsx,tsx,mdx}', // visi faili mapē "components"
    './app/**/*.{js,ts,jsx,tsx,mdx}',        // visi faili mapē "app"
  ],

  // Tumšais režīms būs atkarīgs no CSS klases (piem., <html class="dark">)
  darkMode: 'class',

  theme: {
    extend: {
      // Pievienojam savas pielāgotās krāsas
      colors: {
        brand: {
          primary: '#7B1E3D', // galvenā brenda krāsa (piem. pogām, akcentiem)
          accent: '#26C6DA',  // akcenta krāsa (piem. linkiem vai detaļām)
          sand: '#FAF3E0',    // gaiša, smilšu krāsa (foniem vai kontrastam)
        },
        secondary: {
          50:  '#fafafa', // ļoti gaiša
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b', // ļoti tumša
        }
      },

      // Pievienojam pielāgotu fontu (Inter ar rezerves variantiem)
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },

  // Papildu Tailwind spraudņi (ja nepieciešams)
  plugins: [],
}
