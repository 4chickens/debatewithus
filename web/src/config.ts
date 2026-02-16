const rawUrl = process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Ensure the URL starts with a protocol and remove trailing slash
export const API_URL = (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).replace(/\/$/, '');
