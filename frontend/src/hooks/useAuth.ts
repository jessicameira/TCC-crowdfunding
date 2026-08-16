import { useContext } from 'react';
import { AuthContext, AuthContextValue } from '../context/auth-context';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
}
