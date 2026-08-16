import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../hooks/useAuth';

function Header() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#e5e5e7] bg-white/80 backdrop-blur-md dark:border-primary/20 dark:bg-background-dark/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-white">
            <Icon name="diversity_3" className="text-xl" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">Quori</h1>
        </Link>

        <div className="max-w-xl flex-1">
          <div className="group relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary"
            />
            <input
              type="text"
              placeholder="Buscar eventos, artistas ou locais..."
              className="w-full rounded-xl border-none bg-gray-100 py-2.5 pl-10 pr-4 text-sm placeholder:text-gray-500 focus:ring-2 focus:ring-primary/50 dark:bg-white/5"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-primary">
            <Icon name="location_on" className="text-primary" />
            <span>Curitiba, PR</span>
          </button>
          <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
            <Link to="/" className="transition-colors hover:text-primary">
              Explorar
            </Link>
            <Link to="/como-funciona" className="transition-colors hover:text-primary">
              Como funciona
            </Link>
            <Link to="/criar-evento" className="transition-colors hover:text-primary">
              Criar Evento
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {isLoading ? null : user ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden text-sm font-semibold sm:inline">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-4 py-2 text-sm font-bold text-primary transition-all hover:bg-primary/10"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-4 py-2 text-sm font-bold text-primary transition-all hover:bg-primary/10"
                >
                  Login
                </Link>
                <Link
                  to="/cadastro"
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                >
                  Criar Conta
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
