import { createContext } from 'react';
import { AuthUser } from '../lib/api';

export type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
