/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontSize: {
        small: ["0.8rem", { lineHeight: "1.2" }],
        base: ["1rem", { lineHeight: "1.5" }],
        large: ["1.2rem", { lineHeight: "1.75" }],
        xlarge: ["1.5rem", { lineHeight: "2" }],
      },
      screens: {
        xs: "480px",
      },
      fontFamily: {
        sans: ["Mulish", "sans-serif"],
      },
      scale: {
        117: "1.17",
      },
      colors: {
        // Primary Theme Color - Soft Indigo #4F46E5 (= Tailwind indigo-600,
        // which is what the app uses directly via indigo-* classes)
        primary: {
          DEFAULT: "#4F46E5",
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        // Theme color shorthand
        theme: {
          DEFAULT: "#4F46E5",
          light: "#6366F1",
          dark: "#3730A3",
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#4F46E5",
          600: "#4338CA",
          700: "#3730A3",
        },
        // Accent Colors
        accent: {
          cyan: "#06b6d4",
          charcoal: "#374151",
          amber: "#f59e0b",
          rose: "#f43f5e",
          violet: "#8b5cf6",
        },
        // Dashboard specific
        dashboard: {
          bg: "#f8fafc",
          card: "rgba(255, 255, 255, 0.7)",
          border: "rgba(255, 255, 255, 0.5)",
        },
      },
      boxShadow: {
        widget: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        "widget-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        "glass-hover": "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
        "bento": "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)",
        "bento-hover": "0 4px 8px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.1)",
        "card-soft": "0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 4px 16px -4px rgba(0, 0, 0, 0.08)",
        "card-glow": "0 0 20px rgba(139, 92, 246, 0.15)",
        "stat-card": "0 4px 20px -4px rgba(0, 0, 0, 0.1)",
      },
      backdropBlur: {
        glass: "20px",
        xs: "2px",
      },
      backgroundImage: {
        // Theme Gradient - Dark Navy
        "gradient-theme": "linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)",
        "gradient-theme-light": "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
        "gradient-theme-dark": "linear-gradient(135deg, #3730A3 0%, #060e1a 100%)",
        // Modern Gradients
        "gradient-primary": "linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)",
        "gradient-success": "linear-gradient(135deg, #03cf65 0%, #4dffae 100%)",
        "gradient-warning": "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
        "gradient-info": "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
        "gradient-purple": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "gradient-cyan": "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
        "gradient-charcoal": "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
        "gradient-amber": "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
        "gradient-rose": "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)",
        // Subtle backgrounds with navy theme
        "mesh-gradient": "radial-gradient(at 40% 20%, hsla(245,83%,58%,0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(245,83%,68%,0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(245,83%,58%,0.06) 0px, transparent 50%)",
      },
      animation: {
        "counter": "counter 1s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "slide-in-right": "slideInRight 0.4s ease-out forwards",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "scale-in": "scaleIn 0.3s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "gradient-x": "gradientX 3s ease infinite",
      },
      keyframes: {
        counter: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};
