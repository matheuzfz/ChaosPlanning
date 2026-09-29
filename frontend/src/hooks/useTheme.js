import { useState, useEffect } from 'react';

/**
 * Hook para gerenciamento do tema Claro/Escuro.
 * Alterna a classe 'dark' na tag <html> e sincroniza a preferência no localStorage.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // 1. Tenta recuperar preferência salva no localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    // 2. Consulta a preferência do sistema operacional
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return {
    theme,
    toggleTheme,
    isDark: theme === 'dark',
  };
}

export default useTheme;
