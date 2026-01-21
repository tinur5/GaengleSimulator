// app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-3xl font-bold mb-4">Energy Simulator</h1>
      <p className="mb-4">Simulate energy consumption and storage for buildings.</p>
      <Link href="/dashboard" className="bg-blue-500 text-white px-4 py-2 rounded">
        Go to Dashboard
      </Link>
    </div>
  );
}