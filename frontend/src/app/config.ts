export const API_ORIGIN = 'http://localhost:3000';
export const API_URL = `${API_ORIGIN}/api`;

// keep this the same number as PESOS_PER_POINT in backend/.env
export const PESOS_PER_POINT = 10;

// the server returns image paths like /api/menu/5/image?v=1
export const imageUrl = (path?: string | null) =>
  path ? (path.startsWith('http') ? path : API_ORIGIN + path) : null;
