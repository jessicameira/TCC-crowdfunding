import { ReactNode, useEffect, useState } from 'react';
import { AuthUser, getMe } from '../lib/api';
import { clearAccessToken, getAccessToken, saveAccessToken } from '../lib/auth-storage';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    getMe(token)
      .then(setUser)
      .catch(() => clearAccessToken())
      .finally(() => setIsLoading(false));
  }, []);

  function login(accessToken: string, authenticatedUser: AuthUser) {
    saveAccessToken(accessToken);
    setUser(authenticatedUser);
  }

  function logout() {
    clearAccessToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
