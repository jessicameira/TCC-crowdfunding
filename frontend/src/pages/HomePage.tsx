import Hero from '../components/Hero';
import CategoryFilters from '../components/CategoryFilters';
import NearbyEventsSection from '../components/NearbyEventsSection';
import RecommendedEventsSection from '../components/RecommendedEventsSection';

function HomePage() {
  return (
    <>
      <Hero />
      <CategoryFilters />
      <NearbyEventsSection />
      <RecommendedEventsSection />
    </>
  );
}

export default HomePage;
