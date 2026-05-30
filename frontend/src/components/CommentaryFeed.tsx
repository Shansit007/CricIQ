// ============================================
// CommentaryFeed.tsx — Scrolling AI commentary panel
// Shows ball-by-ball commentary, AI lines get a badge
// ============================================

import { useRef, useEffect } from 'react';
import type { BallEvent } from '../types/cricket';

interface CommentaryFeedProps {
  balls: BallEvent[];  // all balls received so far (commentary inside each)
}

export default function CommentaryFeed({ balls }: CommentaryFeedProps) {
  // ref to auto-scroll to newest commentary
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever new ball arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [balls.length]);

  // ---- Helper: pick text color by ball type ----
  const getLineColor = (ball: BallEvent): string => {
    if (ball.is_wicket)            return 'text-accent-red';   // red for wickets
    if (ball.runs_this_ball === 6) return 'text-accent-gold';  // gold for sixes
    if (ball.runs_this_ball === 4) return 'text-blue-400';     // blue for fours
    return 'text-text-primary';                                 // white for everything else
  };

  // ---- Helper: over.ball string ----
  const overBall = (ball: BallEvent): string => `${ball.over + 1}.${ball.ball}`;

  // Show only the last 30 balls in the feed (don't flood the screen)
  const recentBalls = [...balls].slice(-30).reverse();  // newest first

  return (
    <div className="criciq-card flex flex-col h-96">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <p className="text-text-secondary text-xs uppercase tracking-widest font-semibold">
          Commentary
        </p>
        {/* Ball count badge */}
        <span className="text-xs bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 px-2 py-0.5 rounded-full">
          {balls.length} balls
        </span>
      </div>

      {/* Scrollable commentary list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {/* Empty state */}
        {balls.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-text-secondary text-sm">Commentary will appear here...</p>
          </div>
        )}

        {/* Commentary lines — newest at top */}
        {recentBalls.map((ball, idx) => (
          <div
            key={idx}
            className={`
              flex gap-2 p-2 rounded-lg border-l-2 fade-in-up
              ${ball.is_wicket
                ? 'bg-accent-red/10 border-accent-red'
                : ball.runs_this_ball === 6
                ? 'bg-accent-gold/10 border-accent-gold'
                : ball.runs_this_ball === 4
                ? 'bg-blue-500/10 border-blue-500'
                : 'bg-white/3 border-transparent'
              }
            `}
          >
            {/* Over.ball label */}
            <span className="text-xs text-text-secondary font-mono flex-shrink-0 mt-0.5 w-8">
              {overBall(ball)}
            </span>

            {/* Commentary text */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug ${getLineColor(ball)}`}>
                {ball.commentary || 'No commentary available.'}
              </p>

              {/* Bottom row: run score + AI badge */}
              <div className="flex items-center gap-2 mt-1">
                {/* Run badge */}
                <span className="text-xs text-text-secondary">
                  {ball.is_wicket
                    ? '🔴 WICKET'
                    : ball.runs_this_ball === 0
                    ? 'Dot ball'
                    : `${ball.runs_this_ball} run${ball.runs_this_ball !== 1 ? 's' : ''}`
                  }
                </span>

                {/* ✦ AI badge — only shown for Groq-generated lines */}
                {ball.is_ai_commentary && (
                  <span className="text-xs text-accent-cyan flex items-center gap-0.5">
                    <span>✦</span>
                    <span>AI</span>
                  </span>
                )}

                {/* Win probability after this ball */}
                <span className="text-xs text-text-secondary ml-auto">
                  {Math.round(ball.win_probability * 100)}% win
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Invisible div at bottom — scroll target */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
