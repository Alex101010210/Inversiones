// ─────────────────────────────────────────────────────────────────────────────
// Store global de la aplicación (Zustand con persistencia en localStorage).
//
// Tres stores independientes:
//   - useThemeStore:     modo oscuro/claro, persiste la preferencia entre sesiones
//   - useAuthStore:      token JWT y datos del usuario autenticado
//   - usePortfolioStore: ID del portafolio activo seleccionado en el sidebar
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Tema (modo oscuro/claro) ─────────────────────────────────────────────────
// Persiste la preferencia en localStorage bajo la clave 'investment-erp-theme'
export const useThemeStore = create(
  persist(
    (set, get) => ({
      dark: false,
      // Alterna entre modo oscuro y claro actualizando la clase CSS en <html>
      toggleDark: () => {
        const next = !get().dark;
        set({ dark: next });
        // Activa/desactiva la clase 'dark' en el elemento raíz para los estilos Tailwind
        document.documentElement.classList.toggle('dark', next);
      },
      // Se llama una vez antes del primer render para sincronizar el DOM con el estado guardado
      initTheme: () => {
        document.documentElement.classList.toggle('dark', get().dark);
      },
    }),
    {
      name: 'investment-erp-theme',
      // Después de rehidratar desde localStorage, volver a sincronizar la clase CSS
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.toggle('dark', state.dark);
        }
      },
    }
  )
);

// ─── Autenticación ────────────────────────────────────────────────────────────
// Guarda el token JWT y los datos del usuario para usarlos en toda la app.
// Se persiste en localStorage para mantener la sesión tras recargar la página.
export const useAuthStore = create(
  persist(
    (set) => ({
      user:  null,   // { id, email, name }
      token: null,   // JWT string
      setAuth:    (user, token) => set({ user, token }),   // llamado al hacer login/register
      clearAuth:  () => set({ user: null, token: null }),  // llamado al hacer logout
      updateUser: (user) => set({ user }),                 // llamado al actualizar perfil
    }),
    { name: 'investment-erp-auth' }
  )
);

// ─── Portafolio activo ────────────────────────────────────────────────────────
// El ID del portafolio seleccionado en el sidebar. Se usa en todas las páginas
// que necesitan filtrar datos por portafolio (dashboard, riesgo, IA, etc.)
export const usePortfolioStore = create(
  persist(
    (set) => ({
      activePortfolioId: null,
      setActivePortfolio: (id) => set({ activePortfolioId: id }),
    }),
    { name: 'investment-erp-portfolio' }
  )
);
