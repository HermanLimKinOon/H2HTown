import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import Hero from './components/Hero';
import Shows from './components/Shows';
import Courses from './components/Courses';
import LiveNow from './components/LiveNow';
import ShopDeals from './components/ShopDeals';
import Rewards from './components/Rewards';

export default function Home() {
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />
      <Hero />
      <Shows />
      <Courses />
      <ShopDeals />
      <LiveNow />
      <Rewards />
      <Footer />
    </main>
  );
}
