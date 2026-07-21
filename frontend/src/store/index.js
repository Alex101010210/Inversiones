import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set, get) => ({
      dark: false,
      toggleDark: () => {
        const next = !get().dark;
        set({ dark: next });
        // Apply to <html> so Tailwind's dark: variants activate
        document.documentElement.classList.toggle('dark', next);
      },
      initTheme: () => {
        // Called once before first render to sync DOM with persisted state
        document.documentElement.classList.toggle('dark', get().dark);
      },
    }),
    {
      name: 'investment-erp-theme',
      // After rehydration, re-sync the DOM class
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.dark);
        }
      },
    }
  )
);

export const useAuthStore = create(
  persist(
    (set) => ({
      user:  null,
      token: null,
      setAuth:   (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
      updateUser: (user) => set({ user }),
    }),
    { name: 'investment-erp-auth' }
  )
);

export const usePortfolioStore = create(
  persist(
    (set) => ({
      activePortfolioId: null,
      setActivePortfolio: (id) => set({ activePortfolioId: id }),
    }),
    { name: 'investment-erp-portfolio' }
  )
);
