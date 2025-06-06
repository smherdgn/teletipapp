
import apiClient from './api';
import {User} from '@customtypes/index';
import Storage from '@utils/storage'; // For storing token

interface LoginResponse {
  user: User;
  token: string;
}

// Simulate API calls
const MOCK_USERS: User[] = [
  { id: 'user1', name: 'Test User', email: 'test@example.com', role: 'patient', avatarUrl: 'https://i.pravatar.cc/150?u=user1' },
  { id: 'doc1', name: 'Dr. Aylin Yılmaz', email: 'aylin@example.com', role: 'doctor', avatarUrl: 'https://i.pravatar.cc/150?u=doc1' },
];


export const AuthService = {
  login: async (email: string, password_unused: string): Promise<LoginResponse> => {
    // In a real app, this would be:
    // const response = await apiClient.post<LoginResponse>('/auth/login', {email, password});
    // return response.data;

    // Mock implementation:
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const user = MOCK_USERS.find(u => u.email === email);
        if (user) { // (In real app, also check password)
          const token = `mock-jwt-token-for-${user.id}`;
          Storage.setItem('authToken', token); // Store token
          Storage.setItem('authUser', JSON.stringify(user)); // Store user
          resolve({user, token});
        } else {
          reject(new Error('Invalid credentials'));
        }
      }, 1000);
    });
  },

  logout: async (): Promise<void> => {
    // In a real app, you might want to invalidate the token on the server:
    // await apiClient.post('/auth/logout');
    await Storage.removeItem('authToken');
    await Storage.removeItem('authUser');
    // Clear any other session-related data
    return Promise.resolve();
  },

  register: async (userData: Omit<User, 'id'> & {password: string}): Promise<LoginResponse> => {
    // const response = await apiClient.post<LoginResponse>('/auth/register', userData);
    // return response.data;

    // Mock implementation:
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (MOCK_USERS.find(u => u.email === userData.email)) {
          reject(new Error('User already exists'));
          return;
        }
        const newUser: User = {
          id: `user-${Math.random().toString(36).substr(2, 9)}`,
          ...userData,
        };
        MOCK_USERS.push(newUser);
        const token = `mock-jwt-token-for-${newUser.id}`;
        Storage.setItem('authToken', token);
        Storage.setItem('authUser', JSON.stringify(newUser));
        resolve({user: newUser, token});
      }, 1000);
    });
  },

  // Example: Get current authenticated user profile (if token is valid)
  getCurrentUser: async (): Promise<User | null> => {
    try {
      // This would typically fetch from an endpoint like '/users/me'
      // const response = await apiClient.get<User>('/users/me');
      // return response.data;
      const userJson = await Storage.getItem('authUser');
      if (userJson) {
        return JSON.parse(userJson) as User;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  },

  // Example: Refresh token (conceptual)
  // refreshToken: async (): Promise<{ token: string }> => {
  //   const oldRefreshToken = await Storage.getItem('refreshToken');
  //   const response = await apiClient.post('/auth/refresh', { refreshToken: oldRefreshToken });
  //   const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;
  //   await Storage.setItem('authToken', newAccessToken);
  //   await Storage.setItem('refreshToken', newRefreshToken); // Store new refresh token
  //   return { token: newAccessToken };
  // },
};
