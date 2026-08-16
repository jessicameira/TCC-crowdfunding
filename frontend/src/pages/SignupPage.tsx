import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await register({ name, email, password });
      login(result.accessToken, result.user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 px-6 py-20">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Criar conta</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Cadastre-se para manifestar interesse em eventos e ajudar a formar quóruns.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Nome
          <input
            type="text"
            placeholder="Seu nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            className="rounded-xl border-none bg-gray-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 dark:bg-white/5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          E-mail
          <input
            type="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-xl border-none bg-gray-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 dark:bg-white/5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Senha
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="rounded-xl border-none bg-gray-100 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 dark:bg-white/5"
          />
        </label>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-xl bg-primary py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Já tem conta?{' '}
        <Link to="/login" className="font-bold text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </section>
  );
}

export default SignupPage;
