import { Student } from '../../types';

// Misma lógica de comparación de nombres que ya se probó a mano durante la conciliación bancaria
// de agosto (encontró a Carol Flotats y Miríam Clar Masip duplicadas por casualidad) — aquí queda
// como herramienta reutilizable en vez de tener que repetir el proceso manual cada vez.

function stripAccents(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeName(s: string): string {
    return stripAccents(s)
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}

// Similitud en [0,1]: 1 = nombres idénticos tras normalizar. También detecta el mismo nombre con
// las palabras en otro orden (p.ej. "Jennifer Vega Piñero" vs "Jennifer Piñero Vega").
function similarity(a: string, b: string): number {
    const na = normalizeName(a);
    const nb = normalizeName(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;

    const wordsA = na.split(' ').filter(Boolean).sort().join(' ');
    const wordsB = nb.split(' ').filter(Boolean).sort().join(' ');
    if (wordsA === wordsB) return 0.98;

    const directSim = 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
    const sortedSim = 1 - levenshtein(wordsA, wordsB) / Math.max(wordsA.length, wordsB.length);
    return Math.max(directSim, sortedSim);
}

export interface DuplicateCandidate {
    a: Student;
    b: Student;
    score: number;
}

const DEFAULT_THRESHOLD = 0.82;

// O(n²) sobre la lista de alumnos -- perfectamente asumible en el navegador para las magnitudes
// de una academia (cientos de alumnos, no decenas de miles), y solo se ejecuta bajo demanda al
// abrir la herramienta, no en cada render de la lista de alumnos.
export function findPossibleDuplicates(students: Student[], threshold: number = DEFAULT_THRESHOLD): DuplicateCandidate[] {
    const results: DuplicateCandidate[] = [];
    for (let i = 0; i < students.length; i++) {
        for (let j = i + 1; j < students.length; j++) {
            const score = similarity(students[i].name, students[j].name);
            if (score >= threshold) {
                results.push({ a: students[i], b: students[j], score });
            }
        }
    }
    return results.sort((x, y) => y.score - x.score);
}
