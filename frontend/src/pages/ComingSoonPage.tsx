import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

type ComingSoonPageProps = {
  title: string;
};

function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="construction" />
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-gray-500 dark:text-gray-400">Essa página ainda está em construção.</p>
      <Link to="/" className="font-bold text-primary hover:underline">
        Voltar para a página inicial
      </Link>
    </section>
  );
}

export default ComingSoonPage;
