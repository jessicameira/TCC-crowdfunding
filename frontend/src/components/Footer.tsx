import { Link } from 'react-router-dom';
import Icon from './Icon';

function Footer() {
  return (
    <footer className="border-t border-[#e5e5e7] bg-white pb-8 pt-16 dark:border-primary/20 dark:bg-background-dark">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="col-span-1 md:col-span-1">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded bg-primary text-white">
                <Icon name="diversity_3" className="text-xs" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-primary">Quori</h2>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              A plataforma onde a comunidade decide o que acontece na cidade. Movimento, cultura e
              conexão.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-primary">
                <Icon name="public" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary">
                <Icon name="alternate_email" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-6 font-bold">Plataforma</h4>
            <ul className="flex flex-col gap-4 text-sm text-gray-500">
              <li>
                <Link to="/como-funciona" className="transition-colors hover:text-primary">
                  Como funciona
                </Link>
              </li>
              <li>
                <Link to="/" className="transition-colors hover:text-primary">
                  Explorar eventos
                </Link>
              </li>
              <li>
                <Link to="/criar-evento" className="transition-colors hover:text-primary">
                  Criar Evento
                </Link>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Categorias
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-bold">Suporte</h4>
            <ul className="flex flex-col gap-4 text-sm text-gray-500">
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Regras da comunidade
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Segurança
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 font-bold">Newsletter</h4>
            <p className="mb-4 text-sm text-gray-500">
              Receba novidades sobre os eventos mais esperados.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Seu e-mail"
                className="flex-1 rounded-lg border-none bg-gray-100 text-sm focus:ring-primary dark:bg-white/5"
              />
              <button className="rounded-lg bg-primary p-2 text-white transition-all hover:bg-primary/90">
                <Icon name="send" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 text-xs text-gray-400 dark:border-white/10 md:flex-row">
          <p>© 2026 Quori. Projeto Universitário - Curitiba, PR.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-primary">
              Privacidade
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Termos
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
