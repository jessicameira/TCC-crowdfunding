import { Link } from 'react-router-dom';
import Icon from './Icon';

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white py-20 dark:bg-background-dark">
      <div className="absolute right-0 top-0 h-[600px] w-[600px] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 h-[400px] w-[400px] -translate-x-1/3 translate-y-1/2 rounded-full bg-secondary/5 blur-3xl" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
        <div className="flex flex-col gap-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary">
            <Icon name="bolt" className="text-sm" />
            <span className="text-xs font-bold uppercase tracking-wider">Movimento Coletivo</span>
          </div>
          <h2 className="text-5xl font-black leading-[1.1] tracking-tight text-[#121018] lg:text-7xl dark:text-white">
            Eventos só acontecem quando o <span className="text-primary">público se une</span>
          </h2>
          <p className="max-w-lg text-lg leading-relaxed text-gray-600 dark:text-gray-400">
            Encontre e financie as experiências que você quer ver na sua cidade. Junte-se a
            movimentos e faça eventos acontecerem juntos.
          </p>
          <div className="flex gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-bold text-white shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Explorar Eventos
              <Icon name="arrow_forward" />
            </Link>
            <Link
              to="/criar-evento"
              className="flex items-center gap-2 rounded-xl border-2 border-gray-100 bg-white px-8 py-4 text-lg font-bold transition-all hover:border-primary/30"
            >
              Criar Evento
            </Link>
          </div>
        </div>

        <div className="relative">
          <div
            className="aspect-video rotate-3 overflow-hidden rounded-3xl border-8 border-white bg-cover bg-center shadow-2xl transition-transform duration-500 hover:rotate-0 lg:aspect-square dark:border-white/5"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDtvxbgadH8lOrDsNWezIqUmpj2uMtM7Wix_22qYCkZiRvEiKgvqr_rsofEm91lrrAXzgBy-8nT_tG0WXXlX5QIWKVcUk11r0qTKrv-amtTXqQmXXgJuL1P-YDrjHhzSN3ySEs7IHMpxYeg2OedQJA5ugElXwqWFW8z3oZ7_h5GmMyON5MNkuw12nJ6R-Om_B-ReKqox8j4sUN26HTAG6cNkySULsWCX872keKE8BlV-P08TXh58etM8koe6qE2DPiTU6pPSHofq6u7')",
            }}
            role="img"
            aria-label="Pessoas comemorando em um show ao vivo"
          />
          <div className="absolute -bottom-6 -left-6 flex max-w-[200px] flex-col gap-1 rounded-2xl bg-secondary p-6 text-white shadow-xl">
            <span className="text-3xl font-black tracking-tighter">8.4k+</span>
            <span className="text-sm font-medium leading-tight opacity-90">
              Pessoas já realizaram eventos este mês
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
