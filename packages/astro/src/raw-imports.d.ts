// Vite and Vitest load `?raw` imports as strings; tests use them for fixture files
// because packages/astro has no Node types (no fs).
declare module '*?raw' {
  const content: string;
  export default content;
}
