
import {jwtDecode, JwtPayload} from 'jwt-decode'; // Using jwt-decode library

interface DecodedToken extends JwtPayload {
  userId?: string;
  role?: string;
  // Add any other custom claims you expect in your JWT
}

export const JwtUtils = {
  decodeToken: (token: string): DecodedToken | null => {
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      return decoded;
    } catch (error) {
      console.error('Failed to decode JWT token:', error);
      return null;
    }
  },

  isTokenExpired: (token: string): boolean => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded.exp) {
        const currentTime = Date.now() / 1000; // Convert to seconds
        return decoded.exp < currentTime;
      }
      return false; // No expiration claim, assume not expired or handle as error
    } catch (error) {
      console.error('Failed to check token expiration:', error);
      return true; // Assume expired or invalid on error
    }
  },

  // You can add other utility functions here, like getting specific claims
  getUserIdFromToken: (token: string): string | null => {
    const decoded = JwtUtils.decodeToken(token);
    return decoded?.userId || null;
  },
};
