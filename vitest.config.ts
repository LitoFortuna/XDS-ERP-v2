import { defineConfig } from 'vitest/config';

// Config de test separada de vite.config.ts a propósito: los tests son funciones puras de
// TypeScript (sin DOM), así que no hace falta arrastrar el plugin de PWA ni el de Tailwind del
// build de la app -- solo ralentizarían la ejecución de los tests sin aportar nada.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
    },
});
