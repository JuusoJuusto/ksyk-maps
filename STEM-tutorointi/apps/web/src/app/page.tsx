'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: '🤖',
      title: 'AI Tutor',
      description: 'Get instant help from our advanced AI tutor. Ask questions, get explanations, and learn at your own pace with personalized guidance.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: '📊',
      title: 'Progress Tracking',
      description: 'Monitor your learning journey with detailed analytics. Track XP, streaks, and mastery across all subjects with beautiful visualizations.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: '⚡',
      title: 'Adaptive Learning',
      description: 'Exercises that adapt to your skill level. The platform learns from your performance and adjusts difficulty in real-time.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: '🎮',
      title: 'Gamification',
      description: 'Earn XP, unlock achievements, and compete on leaderboards. Make learning fun and addictive with daily quests and rewards.',
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const stats = [
    { value: '10K+', label: 'AI-Generated Exercises' },
    { value: '98%', label: 'Student Success Rate' },
    { value: '24/7', label: 'AI Tutor Support' },
    { value: '50+', label: 'Topics Covered' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center transform group-hover:scale-110 transition-all duration-300 shadow-lg">
                <span className="text-white font-bold text-lg">SG</span>
              </div>
              <span className="text-xl font-bold text-blue-600">
                STEM Genius
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                How it works
              </a>
              <a href="#pricing" className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                Pricing
              </a>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-medium">
                  Sign in
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-lg font-semibold">
                  Get started free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                AI-Powered Learning Platform
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
              <span className="text-neutral-900 dark:text-white">
                Master STEM with
              </span>
              <br />
              <span className="text-blue-600 dark:text-blue-500">
                Intelligent AI
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              Personalized learning paths, adaptive exercises, and real-time AI tutoring
              designed for Finnish high school students.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl transition-all duration-300 h-14 px-8 text-lg font-semibold">
                  Start learning free
                  <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="border-2 border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 h-14 px-8 text-lg font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all duration-300">
                  View demo
                  <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto pt-12 border-t border-neutral-200 dark:border-neutral-800">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group cursor-pointer">
                  <div className="text-4xl md:text-5xl font-bold text-blue-600 dark:text-blue-500 mb-2 group-hover:scale-110 transition-transform duration-300">
                    {stat.value}
                  </div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-white dark:bg-neutral-950">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
              Everything you need to{' '}
              <span className="text-blue-600 dark:text-blue-500">
                excel
              </span>
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Comprehensive tools for modern STEM education, powered by cutting-edge AI technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="group relative p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                onMouseEnter={() => setActiveFeature(index)}
              >
                
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mb-6 text-3xl transform group-hover:scale-110 transition-all duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-neutral-50 dark:bg-neutral-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
              Start learning in{' '}
              <span className="text-blue-600 dark:text-blue-500">
                3 simple steps
              </span>
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Get started with personalized AI-powered learning in minutes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Account',
                description: 'Sign up in seconds and tell us about your learning goals and subjects you want to master.',
                icon: '👤',
              },
              {
                step: '02',
                title: 'AI Assessment',
                description: 'Take a quick AI-powered assessment to identify your strengths and areas for improvement.',
                icon: '🎯',
              },
              {
                step: '03',
                title: 'Start Learning',
                description: 'Get personalized exercises, AI tutoring, and track your progress with gamification.',
                icon: '🚀',
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                {/* Connection Line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-blue-200 dark:bg-blue-900"></div>
                )}
                
                <div className="relative bg-white dark:bg-neutral-900 rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className="text-6xl mb-4">{item.icon}</div>
                  <div className="text-sm font-bold text-blue-500 mb-2">STEP {item.step}</div>
                  <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-blue-600 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to transform your learning?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of students mastering STEM subjects with AI-powered personalized learning.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-neutral-100 hover:scale-105 transition-all duration-300 h-14 px-8 text-lg font-semibold shadow-xl">
              Get started for free
              <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </Link>
          <p className="mt-4 text-sm text-white/80">
            No credit card required • Free forever • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-12 px-6 bg-white dark:bg-neutral-950">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">SG</span>
                </div>
                <span className="font-bold text-neutral-900 dark:text-white">STEM Genius</span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                AI-powered learning platform for Finnish high school students.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Features</a></li>
                <li><a href="#pricing" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Pricing</a></li>
                <li><Link href="/dashboard" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Dashboard</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white mb-4">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">About</a></li>
                <li><a href="#" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Blog</a></li>
                <li><a href="#" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Terms</a></li>
                <li><a href="#" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              © 2026 STEM Genius. All rights reserved.
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
