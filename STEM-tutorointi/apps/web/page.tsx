import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            STEM-tutorointi
          </div>
          <Link href="/login" className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition-colors font-medium">
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center rounded-full bg-slate-800/50 px-4 py-2 mb-6 border border-slate-700">
            <span className="text-sm text-cyan-400">✨ AI-Powered Learning Ecosystem</span>
          </div>

          {/* Hero Heading */}
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            The Future of
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Personalized Learning
            </span>
          </h1>

          {/* Hero Subheading */}
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            Meet your AI tutor that adapts to your learning style, understands your goals, and guides you toward mastery with gamified challenges, real-time feedback, and personalized learning paths.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center flex-wrap mb-16">
            <Link
              href="/register"
              className="px-8 py-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg transition-all transform hover:scale-105"
            >
              Start Learning Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-lg border border-slate-600 hover:border-cyan-400 text-slate-200 font-bold text-lg transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-cyan-400">10K+</div>
              <p className="text-slate-400">Active Learners</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">98%</div>
              <p className="text-slate-400">Satisfaction Rate</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">5x</div>
              <p className="text-slate-400">Faster Progress</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-4xl font-bold text-center text-white mb-16">Why Choose STEM-tutorointi?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl border border-slate-700 hover:border-cyan-400/50 transition-colors bg-slate-800/30 backdrop-blur">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-bold text-white mb-3">AI Tutor</h3>
              <p className="text-slate-300">
                Conversational AI that teaches like a genius private tutor, adapting to your learning style in real-time.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="p-8 rounded-2xl border border-slate-700 hover:border-cyan-400/50 transition-colors bg-slate-800/30 backdrop-blur">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-xl font-bold text-white mb-3">Gamification</h3>
              <p className="text-slate-300">
                Earn XP, streaks, and achievements. Compete on leaderboards and unlock rewards as you master subjects.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="p-8 rounded-2xl border border-slate-700 hover:border-cyan-400/50 transition-colors bg-slate-800/30 backdrop-blur">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-3">Smart Analytics</h3>
              <p className="text-slate-300">
                Beautiful dashboards showing progress heatmaps, insights, and personalized recommendations.
              </p>
            </div>
            {/* Feature 4 */}
            <div className="p-8 rounded-2xl border border-slate-700 hover:border-cyan-400/50 transition-colors bg-slate-800/30 backdrop-blur">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-bold text-white mb-3">Adaptive Learning</h3>
              <p className="text-slate-300">
                Difficulty adjusts to your skill level. Get harder challenges as you improve, hints when you struggle.
              </p>
            </div>
            {/* Feature 5 */}
            <div className="p-8 rounded-2xl border border-slate-700 hover:border-cyan-400/50 transition-colors bg-slate-800/30 backdrop-blur">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-3">Personalized Paths</h3>
              <p className="text-slate-300">
                AI creates custom learning roadmaps based on your goals, pace, and performance patterns.
              </p>
            </div>
            {/* Feature 6 */}
            <div className="p-8 rounded-2xl border border-slate-700 hover:border-cyan-400/50 transition-colors bg-slate-800/30 backdrop-blur">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold text-white mb-3">Mobile First</h3>
              <p className="text-slate-300">
                Learn anywhere, anytime. Native mobile experience with smooth animations and offline support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-y border-slate-700">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-slate-300 mb-8">
            Join thousands of learners already mastering subjects with our AI-powered platform.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg transition-all transform hover:scale-105"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-cyan-400 transition">Features</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Pricing</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-cyan-400 transition">About</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Blog</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-cyan-400 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Terms</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-white mb-4">Social</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-cyan-400 transition">Twitter</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">LinkedIn</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>&copy; 2024 STEM-tutorointi. All rights reserved. | Built with Next.js & AI</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
