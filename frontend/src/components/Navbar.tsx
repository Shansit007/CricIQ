// ============================================
// Navbar.tsx — Top navigation bar
// Shows on every page of the app
// ============================================

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Props: isLive tells Navbar to show the pulsing LIVE dot
interface NavbarProps {
  isLive?: boolean;
}

export default function Navbar({ isLive = false }: NavbarProps) {
  // Track if hamburger menu is open (for mobile)
  const [menuOpen, setMenuOpen] = useState(false);

  // useLocation tells us which page we're on (so we can highlight active nav link)
  const location = useLocation();

  // Close mobile menu whenever user navigates to a new page
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Helper: is this path the currently active route?
  const isActive = (path: string) => location.pathname === path;

  // Nav links definition — add/remove pages here
  const navLinks = [
    { label: 'Matches',  path: '/matches'  },
    { label: 'Predict',  path: '/predict'  },
    { label: 'Rivalry',  path: '/rivalry'  },
    { label: 'Fantasy',  path: '/fantasy'  },
    { label: 'About',    path: '/about'    },
  ];

  return (
    // Sticky navbar — stays at top when scrolling
    <nav className="sticky top-0 z-50 w-full border-b border-card-border bg-bg-primary/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ---- Left: Logo ---- */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            {/* Cricket ball emoji + gradient text logo */}
            <span className="text-2xl">🏏</span>
            <span
              className="font-display text-3xl gradient-text tracking-wider"
              style={{ fontFamily: "'Bebas Neue', cursive" }}
            >
              CricIQ
            </span>

            {/* LIVE dot — only shows when a match is in progress */}
            {isLive && (
              <div className="flex items-center gap-1 ml-2">
                <span className="w-2 h-2 rounded-full bg-red-500 pulse-red inline-block" />
                <span className="text-xs font-bold text-red-400 tracking-widest">LIVE</span>
              </div>
            )}
          </Link>

          {/* ---- Center: Desktop nav links ---- */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive(link.path)
                    ? 'text-accent-cyan bg-accent-cyan/10 border border-accent-cyan/30'  // active style
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'       // inactive style
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ---- Right: GitHub link (desktop) ---- */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://github.com/Shansit007/CricIQ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-secondary hover:text-text-primary transition-colors text-sm flex items-center gap-1"
            >
              {/* GitHub icon (SVG) */}
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>

          {/* ---- Mobile: Hamburger button ---- */}
          <button
            className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {/* Show X when open, hamburger when closed */}
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            )}
          </button>
        </div>

        {/* ---- Mobile dropdown menu ---- */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-card-border mt-1 pt-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`
                  block px-4 py-3 rounded-lg text-sm font-medium transition-all
                  ${isActive(link.path)
                    ? 'text-accent-cyan bg-accent-cyan/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
