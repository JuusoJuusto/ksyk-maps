import { redirect } from 'next/navigation';
import { getServerUser } from './serverSession';
import SignOutButton from './SignOutButton';

export default async function DashboardPage() {
  const user = await getServerUser();
  if (!user) redirect('/login');

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm">Welcome back, {user.name || 'Learner'}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.email}</p>
              <p className="text-xs text-slate-400">Premium Member</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Welcome Section */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-3">Welcome back, {user.name || 'Learner'}! 👋</h2>
            <p className="text-slate-300 mb-6">
              Your AI-powered learning experience is ready. Continue where you left off or start a new challenge today.
            </p>
            <div className="flex gap-4">
              <button className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors">
                Continue Learning
              </button>
              <button className="px-6 py-3 rounded-lg border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 font-bold transition-colors">
                Browse Courses
              </button>
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-white mb-6">Your Progress</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* XP Card */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:border-cyan-400/50 transition">
              <div className="text-sm text-slate-400 mb-2">Total XP</div>
              <div className="text-3xl font-bold text-cyan-400">2,450</div>
              <div className="text-xs text-slate-500 mt-2">+150 this week</div>
            </div>

            {/* Streak Card */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:border-cyan-400/50 transition">
              <div className="text-sm text-slate-400 mb-2">Current Streak</div>
              <div className="text-3xl font-bold text-amber-400">12 days 🔥</div>
              <div className="text-xs text-slate-500 mt-2">Keep it up!</div>
            </div>

            {/* Lessons Card */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:border-cyan-400/50 transition">
              <div className="text-sm text-slate-400 mb-2">Lessons Completed</div>
              <div className="text-3xl font-bold text-emerald-400">48</div>
              <div className="text-xs text-slate-500 mt-2">8 more than last month</div>
            </div>

            {/* Achievements Card */}
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:border-cyan-400/50 transition">
              <div className="text-sm text-slate-400 mb-2">Achievements</div>
              <div className="text-3xl font-bold text-purple-400">7</div>
              <div className="text-xs text-slate-500 mt-2">Unlock new badges</div>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-900/70 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white">Mastered: Quantum Physics</h4>
                  <p className="text-slate-400 text-sm">Completed all lessons and quizzes</p>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">Completed</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-900/70 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white">In Progress: Advanced Calculus</h4>
                  <p className="text-slate-400 text-sm">6 of 12 lessons completed • 50% done</p>
                </div>
                <span className="text-xs bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full">In Progress</span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 hover:bg-slate-900/70 transition">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white">Achievement Unlocked: Perfect Week</h4>
                  <p className="text-slate-400 text-sm">Completed 7 days of learning without missing a day</p>
                </div>
                <span className="text-xs bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full">New</span>
              </div>
            </div>
          </div>
        </section>

        {/* Recommended Courses */}
        <section>
          <h3 className="text-xl font-bold text-white mb-6">Recommended for You</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Machine Learning Basics', 'Web Development Masterclass', 'Data Science 101'].map((course, i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-700 rounded-xl overflow-hidden hover:border-cyan-400/50 transition">
                <div className="h-32 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-slate-700"></div>
                <div className="p-6">
                  <h4 className="font-bold text-white mb-2">{course}</h4>
                  <p className="text-slate-400 text-sm mb-4">Learn from expert instructors with AI-powered tutoring</p>
                  <button className="w-full py-2 rounded-lg border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 text-sm font-bold transition">
                    Start Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
