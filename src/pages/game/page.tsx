import Navbar from '@/components/feature/Navbar';
import GameWorld from './GameWorld';

export default function Game() {
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />
      <GameWorld />
    </main>
  );
}
