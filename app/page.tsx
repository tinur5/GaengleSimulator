// app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          <div className="text-7xl mb-4">⚡</div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">Energy Simulator</h1>
          <p className="text-xl text-blue-100 mb-8">
            Optimieren Sie Ihren Energiefluss und verwalten Sie Ihre Batterie- und PV-Anlagen intelligenter
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Was Sie tun können</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="text-left">
              <div className="text-3xl mb-2">🏢</div>
              <h3 className="font-bold text-gray-900 mb-2">Gebäude konfigurieren</h3>
              <p className="text-gray-600 text-sm">Definieren Sie PV-Anlage, Batteriekapazität und Effizienz</p>
            </div>
            <div className="text-left">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-bold text-gray-900 mb-2">Mieter verwalten</h3>
              <p className="text-gray-600 text-sm">Fügen Sie Mieter hinzu und definieren Sie deren Energieverbrauch</p>
            </div>
            <div className="text-left">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold text-gray-900 mb-2">Visualisierungen</h3>
              <p className="text-gray-600 text-sm">Sehen Sie detaillierte Charts und Energieflussdiagramme</p>
            </div>
            <div className="text-left">
              <div className="text-3xl mb-2">🔋</div>
              <h3 className="font-bold text-gray-900 mb-2">Live-Simulation</h3>
              <p className="text-gray-600 text-sm">Batteriestand und Energiefluss in Echtzeit überwachen</p>
            </div>
          </div>
        </div>

        <Link 
          href="/dashboard" 
          className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors shadow-lg"
        >
          Zum Dashboard →
        </Link>
      </div>
    </div>
  );
}