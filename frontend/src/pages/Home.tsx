// ============================================
// Home.tsx — Landing page / Hero
// First thing users see when they open CricIQ
// ============================================

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Home() {
  // ref for the animated cricket ball SVG
  const ballRef = useRef<SVGCircleElement>(null);

  // Animate the cricket ball along an arc trajectory
  useEffect(() => {
    const ball = ballRef.current;
    if (!ball) return;

    let frame = 0;
    // requestAnimationFrame = smooth browser animation loop
    const animate = () => {
      frame += 0.5;                                     // speed of animation
      const x = 80 + frame * 1.5;                      // move right
      const y = 200 - Math.sin((frame / 60) * Math.PI) * 120; // arc up then down
      ball.setAttribute('cx', String(x % 800));         // wrap around screen
      ball.setAttribute('cy', String(y));
      requestAnimationFrame(animate);                    // keep looping
    };
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);               // cleanup on unmount
  }, []);

  // Feature cards data — 6 key features of CricIQ
  const features = [
    {
      icon: '📊',
      title: 'Win Probability',
      desc: 'XGBoost ML model trained on 500K+ IPL balls. Updated after every delivery.',
      color: 'border-accent-cyan/30',
      path: '/predict',
    },
    {
      icon: '🤖',
      title: 'AI Commentary',
      desc: 'Llama 3.3 70B generates ball-by-ball commentary like Harsha Bhogle.',
      color: 'border-accent-gold/30',
      path: '/matches',
    },
    {
      icon: '🔍',
      title: 'SHAP Explainability',
      desc: 'Know exactly WHY the probability changed. Plain English, not ML jargon.',
      color: 'border-blue-500/30',
      path: '/predict',
    },
    {
      icon: '⚔️',
      title: 'Rivalry Intelligence',
      desc: 'Head-to-head history, year-by-year trends, top performers in the rivalry.',
      color: 'border-purple-500/30',
      path: '/rivalry',
    },
    {
      icon: '🏏',
      title: 'Fantasy XI',
      desc: 'Budget-constrained optimizer picks your best Dream11 team automatically.',
      color: 'border-green-500/30',
      path: '/fantasy',
    },
    {
      icon: '⚡',
      title: 'Live WebSocket',
      desc: 'Real score every 60s from CricAPI. Ball-by-ball simulation in between.',
      color: 'border-accent-red/30',
      path: '/matches',
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ---- Hero Section ---- */}
      <section className="relative overflow-hidden min-h-screen flex items-center justify-center">

        {/* Animated background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(244,167,3,0.06) 0%, transparent 60%)',
          }}
        />

        {/* Animated cricket ball SVG in background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Arc trajectory path (dashed) */}
          <path
            d="M 0,350 Q 400,50 800,350"
            fill="none"
            stroke="#00D4FF"
            strokeWidth="1"
            strokeDasharray="8 8"
            opacity="0.4"
          />
          {/* The moving cricket ball */}
          <circle ref={ballRef} cx="80" cy="200" r="12" fill="#F4A703" opacity="0.8">
            {/* Seam line on ball */}
          </circle>
          {/* Ball seam */}
          <circle ref={ballRef} cx="80" cy="200" r="12" fill="none" stroke="#CC6600" strokeWidth="1" opacity="0.6" />
        </svg>

        {/* Hero content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent-cyan/10 border border-accent-cyan/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-accent-cyan pulse-cyan inline-block" />
            <span className="text-accent-cyan text-sm font-medium">Powered by XGBoost + Llama 3.3</span>
          </div>

          {/* Main headline */}
          <h1
            className="text-6xl md:text-8xl font-display gradient-text mb-4 leading-none"
            style={{ fontFamily: "'Bebas Neue', cursive" }}
          >
            Cricket Intelligence.
            <br />
            Ball by Ball.
          </h1>

          {/* Subheadline */}
          <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            AI-powered win probability, live commentary &amp; fantasy optimization —
            built for cricket fans who can't watch every ball.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/matches"
              className="
                px-8 py-4 rounded-xl font-semibold text-base
                bg-accent-cyan text-bg-primary
                hover:bg-accent-cyan/90 hover:scale-105
                transition-all duration-200 shadow-lg
                shadow-accent-cyan/20
              "
            >
              🔴 Watch Live Matches
            </Link>
            <Link
              to="/predict"
              className="
                px-8 py-4 rounded-xl font-semibold text-base
                border border-accent-gold text-accent-gold
                hover:bg-accent-gold/10 hover:scale-105
                transition-all duration-200
              "
            >
              📊 Predict a Match
            </Link>
          </div>

          {/* Accuracy badge */}
          <p className="text-text-secondary text-sm mt-6">
            Model accuracy: <span className="text-accent-cyan font-semibold">84%</span> •
            Trained on <span className="text-accent-cyan font-semibold">500K+</span> deliveries •
            All formats
          </p>
        </div>
      </section>

      {/* ---- Features Grid ---- */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-center text-3xl font-display gradient-text mb-2"
            style={{ fontFamily: "'Bebas Neue', cursive" }}>
          What CricIQ Does
        </h2>
        <p className="text-center text-text-secondary mb-10">
          7 AI features designed for cricket fans who study during matches
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => (
            <Link
              key={i}
              to={feat.path}
              className={`criciq-card border ${feat.color} hover:-translate-y-1 hover:border-opacity-70 transition-all duration-200 block group`}
            >
              <span className="text-3xl mb-3 block">{feat.icon}</span>
              <h3 className="text-text-primary font-bold text-base mb-1 group-hover:text-accent-cyan transition-colors">{feat.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">{feat.desc}</p>
              <p className="text-accent-cyan text-xs mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Explore →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- Quick stats strip ---- */}
      <section className="border-t border-card-border py-10">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: '500K+', label: 'Deliveries trained on' },
            { num: '84%',   label: 'Model accuracy' },
            { num: '4',     label: 'Cricket formats' },
            { num: '100%',  label: 'Free to use' },
          ].map(({ num, label }) => (
            <div key={label}>
              <p className="text-3xl font-display text-accent-cyan"
                 style={{ fontFamily: "'Bebas Neue', cursive" }}>{num}</p>
              <p className="text-text-secondary text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-card-border py-6 text-center">
        <p className="text-text-secondary text-sm">
          Built by{' '}
          <a href="https://github.com/Shansit007" className="text-accent-cyan hover:underline">
            Shansit
          </a>{' '}
          • VIT Bhopal • Final Year Project •{' '}
          <a href="https://github.com/Shansit007/CricIQ" className="text-accent-cyan hover:underline">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
