const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
export const API_ORIGIN = isLocal ? 'http://localhost:3000' : 'https://mr-hungry-api.vercel.app';
export const API_URL = `${API_ORIGIN}/api`;

// keep this the same number as PESOS_PER_POINT in backend/.env
export const PESOS_PER_POINT = 10;

// the server returns image paths like /api/menu/5/image?v=1
export const imageUrl = (path?: string | null) =>
  path ? (path.startsWith('http') ? path : API_ORIGIN + path) : null;

// at least 8 characters, with at least one letter and one number
export const isStrongPassword = (p: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(p);
