import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types/api';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    if (api.isAuthenticated()) {
      try {
        const response = await api.getProfile();
        if (response.success) {
          setUser(response.data);
        }
      } catch {
        api.clearToken();
        setUser(null);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      await refreshUser();
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    if (response.success) {
      setUser(response.data.user);
    } else {
      throw new Error('Login failed');
    }
  };

  const register = async (email: string, username: string, password: string) => {
    const response = await api.register(email, username, password);
    if (response.success) {
      setUser(response.data.user);
    } else {
      throw new Error('Registration failed');
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
