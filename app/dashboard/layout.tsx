import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - RouteMax',
  description: 'RouteMax Dashboard',
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">RouteMax</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard/clients" className="text-gray-700 hover:text-gray-900">
                Clients
              </a>
              <a href="/dashboard/routes" className="text-gray-700 hover:text-gray-900">
                Routes
              </a>
              <a href="/dashboard/routes/simple" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Nouvelle Tournée
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
