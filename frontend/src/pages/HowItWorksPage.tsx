import { Link } from 'react-router-dom';
import Icon from '../components/Icon';

const STEPS = [
  {
    icon: 'travel_explore',
    title: 'Descubra eventos perto de você',
    description:
      'Veja eventos culturais próximos à sua localização, ou recomendados com base no que você já demonstrou interesse.',
  },
  {
    icon: 'front_hand',
    title: 'Manifeste interesse',
    description:
      'Encontrou um evento que quer ver acontecer? Clique em "Quero participar". Isso não é uma compra — é um voto de que você topa ir.',
  },
  {
    icon: 'groups',
    title: 'Acompanhe o quórum',
    description:
      'Cada evento tem uma capacidade e um número mínimo de interessados definido pelo produtor. Enquanto esse mínimo não é atingido, o evento fica aguardando.',
  },
  {
    icon: 'verified',
    title: 'Quórum atingido, evento confirmado',
    description:
      'Assim que o número mínimo de interessados é alcançado, o evento é confirmado automaticamente — sem depender de decisão manual.',
  },
  {
    icon: 'payments',
    title: 'Pagamento só depois da confirmação',
    description:
      'O cobrança só é iniciada após o evento ser confirmado. Se o quórum não é atingido, ninguém paga nada.',
  },
  {
    icon: 'confirmation_number',
    title: 'Ingresso liberado',
    description: 'Com o pagamento aprovado, seu ingresso fica disponível automaticamente.',
  },
];

function HowItWorksPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-16 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary">
          <Icon name="bolt" className="text-sm" />
          <span className="text-xs font-bold uppercase tracking-wider">Como funciona</span>
        </div>
        <h1 className="text-4xl font-black leading-tight tracking-tight lg:text-5xl">
          Eventos só acontecem quando <span className="text-primary">o público se une</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          A Quori é diferente de uma plataforma comum de venda de ingressos: em vez de o produtor
          assumir o risco sozinho, o evento só é confirmado (e só então cobrado) depois que atinge
          um número mínimo de pessoas interessadas.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step, index) => (
          <div
            key={step.title}
            className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={step.icon} />
              </div>
              <span className="text-sm font-bold text-gray-400">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="text-lg font-bold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              {step.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 rounded-2xl bg-background-light p-8 dark:bg-white/5 md:grid-cols-2 md:p-12">
        <div>
          <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <Icon name="storefront" />
          </div>
          <h2 className="text-xl font-bold">É produtor ou artista?</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Ao criar um evento, você define a capacidade máxima e o quórum mínimo necessário para
            confirmá-lo. Assim você mede o interesse real do público antes de assumir qualquer
            custo — sem o risco de organizar um evento vazio.
          </p>
        </div>
        <div>
          <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon name="security" />
          </div>
          <h2 className="text-xl font-bold">E se o quórum não for atingido?</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            O evento é cancelado sem gerar nenhuma cobrança. Como o pagamento só é processado
            depois da confirmação, manifestar interesse nunca é um compromisso financeiro.
          </p>
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center gap-4 text-center">
        <h2 className="text-2xl font-bold">Pronto para começar?</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
          >
            Explorar Eventos
            <Icon name="arrow_forward" />
          </Link>
          <Link
            to="/criar-evento"
            className="flex items-center gap-2 rounded-xl border-2 border-gray-100 bg-white px-8 py-4 font-bold transition-all hover:border-primary/30 dark:border-white/10 dark:bg-white/5"
          >
            Criar Evento
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HowItWorksPage;
