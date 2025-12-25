import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RouteMax - Optimisez vos tournées commerciales',
  description: 'Économisez 2+ heures par semaine en optimisant automatiquement vos tournées commerciales. Sélectionnez et ordonnez les meilleurs clients à visiter avec RouteMax.',
  keywords: 'optimisation tournées, planification route, VRP, tournée commerciale',
  openGraph: {
    title: 'RouteMax - Optimisez vos tournées commerciales en quelques clics',
    description: 'Économisez 2+ heures par semaine en optimisant automatiquement vos tournées commerciales.',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RouteMax - Optimisez vos tournées commerciales',
    description: 'Économisez 2+ heures par semaine avec RouteMax',
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-blue-600">RouteMax</div>
            </div>
            <Link
              href="/auth/login"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Optimisez vos tournées commerciales
            <span className="text-blue-600"> en quelques clics</span>
          </h1>
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            RouteMax sélectionne et ordonne automatiquement les meilleurs clients à visiter, économisant aux représentants commerciaux
            <span className="font-semibold text-gray-900"> 2+ heures par semaine</span> en planification manuelle.
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            Augmentez vos visites clients, réduisez vos déplacements, gagnez du temps.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/auth/login"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
            >
              Commencer Gratuitement
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-lg"
            >
              En Savoir Plus
            </Link>
          </div>

          {/* Hero Image/Illustration */}
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg p-8 sm:p-12">
            <svg
              className="w-full h-auto"
              viewBox="0 0 400 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="400" height="300" fill="transparent" />
              <circle cx="100" cy="80" r="40" fill="#3B82F6" opacity="0.2" />
              <circle cx="200" cy="120" r="40" fill="#3B82F6" opacity="0.3" />
              <circle cx="300" cy="100" r="40" fill="#3B82F6" opacity="0.2" />
              <circle cx="150" cy="220" r="40" fill="#3B82F6" opacity="0.25" />
              <circle cx="280" cy="240" r="40" fill="#3B82F6" opacity="0.2" />

              {/* Lines connecting circles */}
              <path
                d="M 100 80 L 200 120 L 300 100 L 280 240 L 150 220 L 100 80"
                stroke="#3B82F6"
                strokeWidth="2"
                opacity="0.4"
              />

              {/* Map icon */}
              <g transform="translate(200, 150)">
                <path
                  d="M -40 0 C -40 -15 -28 -25 -15 -25 C -2 -25 10 -15 10 0 C 10 15 0 25 -15 35 C -30 25 -40 15 -40 0"
                  fill="#3B82F6"
                />
              </g>
            </svg>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Pourquoi choisir RouteMax?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Les outils modernes d'optimisation de tournées pour les commerciaux qui cherchent à être plus productifs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Benefit 1 */}
            <div className="bg-blue-50 rounded-lg p-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Économisez du Temps</h3>
              <p className="text-gray-600">
                Réduisez les 2+ heures par semaine habituellement consacrées à la planification manuelle des tournées. Laissez RouteMax optimiser vos parcours.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="bg-green-50 rounded-lg p-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-full mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Visitez Plus de Clients</h3>
              <p className="text-gray-600">
                Optimisez vos trajets pour visiter plus de clients en moins de temps. Augmentez votre productivité et vos ventes potentielles.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="bg-orange-50 rounded-lg p-8 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-600 rounded-full mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10H3L21 3v18H3v-8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Réduisez les Déplacements</h3>
              <p className="text-gray-600">
                Diminuez les kilomètres parcourus et les coûts de carburant avec des trajets intelligemment ordonnés. Maximisez l'efficacité.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Comment ça marche?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Trois étapes simples pour optimiser vos tournées
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div>
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Importez vos clients</h3>
              <p className="text-gray-600 mb-4">
                Téléchargez votre base de clients au format CSV. RouteMax géolocalise automatiquement les adresses.
              </p>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <svg className="w-full h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Configurez votre tournée</h3>
              <p className="text-gray-600 mb-4">
                Sélectionnez les clients à visiter et définissez votre point de départ. RouteMax sugère les meilleurs itinéraires.
              </p>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <svg className="w-full h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Optimisez et partez</h3>
              <p className="text-gray-600 mb-4">
                Obtenez votre tournée optimisée en quelques secondes. Visualisez sur la carte et lancez votre journée productive.
              </p>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <svg className="w-full h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Fonctionnalités complètes</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour optimiser vos tournées commerciales
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Import CSV</h3>
                <p className="mt-2 text-gray-600">Importez rapidement votre base de clients au format CSV avec géolocalisation automatique.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Optimisation IA</h3>
                <p className="mt-2 text-gray-600">Algorithmes intelligents pour trouver les meilleures séquences de visite et réduire les distances.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6L15 12M9 12L15 6m6-6a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Visualisation cartographique</h3>
                <p className="mt-2 text-gray-600">Visualisez votre tournée optimisée sur Google Maps avec tous les détails du parcours.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Historique des tournées</h3>
                <p className="mt-2 text-gray-600">Gardez un historique complet de toutes vos tournées optimisées avec filtrage et recherche.</p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Export et partage</h3>
                <p className="mt-2 text-gray-600">Exportez vos tournées en CSV ou partagez via lien Google Maps pour votre équipe.</p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Sécurité garantie</h3>
                <p className="mt-2 text-gray-600">Vos données clients sont protégées avec le plus haut niveau de sécurité et de conformité RGPD.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Prêt à optimiser vos tournées?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Rejoignez des centaines de commerciaux qui économisent du temps et augmentent leur productivité avec RouteMax.
          </p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-lg"
          >
            Commencer Gratuitement - Aucune Carte de Crédit Requise
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">RouteMax</h3>
              <p className="text-gray-400">Optimisez vos tournées commerciales en quelques clics.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produit</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Commencer</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Compagnie</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Légal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Conditions d'utilisation</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400">
              © 2025 RouteMax. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
