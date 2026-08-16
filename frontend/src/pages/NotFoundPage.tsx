import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-4xl font-black text-primary">404</h1>
      <p className="text-gray-500 dark:text-gray-400">Página não encontrada.</p>
      <Link to="/" className="font-bold text-primary hover:underline">
        Voltar para a página inicial
      </Link>
    </section>
  );
}

export default NotFoundPage;
