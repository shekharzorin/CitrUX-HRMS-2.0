/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Strategic Override for "Matte Charcoal" Theme
                // This instantly fixes all components using slate-900/950
                slate: {
                    700: '#32353b', // Muted Surface for Tabs/Dropdowns
                    800: '#272a34', // Lighter Surface / Borders
                    850: '#22252c', // Hover states
                    900: '#1e2025', // Main Surface (Card BG) - Matches Reference
                    950: '#131417', // Main Body BG - Matches Reference
                }
            }
        },
    },
    plugins: [],
}
