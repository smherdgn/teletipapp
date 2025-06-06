
export const ROUTE_PATHS = {
  LOGIN: '/login',
  DASHBOARD: '/',
  VIDEO_CALL: '/call/:callId', // Example with a parameter
  PROFILE: '/profile',
};

export const MOCK_USERS = [
  { id: 'doc1', name: 'Dr. Aylin Yılmaz', email: 'aylin.yilmaz@example.com', avatarUrl: 'https://picsum.photos/seed/doc1/100/100', role: 'doctor' },
  { id: 'doc2', name: 'Dr. Mehmet Öztürk', email: 'mehmet.ozturk@example.com', avatarUrl: 'https://picsum.photos/seed/doc2/100/100', role: 'doctor' },
  { id: 'pat1', name: 'Ahmet Çelik', email: 'ahmet.celik@example.com', avatarUrl: 'https://picsum.photos/seed/pat1/100/100', role: 'patient' },
  { id: 'pat2', name: 'Zeynep Kaya', email: 'zeynep.kaya@example.com', avatarUrl: 'https://picsum.photos/seed/pat2/100/100