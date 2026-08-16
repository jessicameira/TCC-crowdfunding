import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { eventCategories } from '../data/eventCategories';

function CategoryFilters() {
  const [active, setActive] = useState(eventCategories[0].label);

  return (
    <section className="border-y border-[#e5e5e7] bg-background-light py-8 dark:border-primary/10 dark:bg-background-dark/50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold">Categorias em alta</h3>
          <Link to="/" className="text-sm font-bold text-primary hover:underline">
            Ver tudo
          </Link>
        </div>
        <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
          {eventCategories.map((category) => {
            const isActive = category.label === active;
            return (
              <button
                key={category.label}
                onClick={() => setActive(category.label)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all ${
                  isActive
                    ? 'bg-primary font-bold text-white'
                    : 'border border-gray-200 bg-white hover:border-primary dark:border-white/10 dark:bg-white/5'
                }`}
              >
                <Icon name={category.icon} className="text-sm" />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CategoryFilters;
