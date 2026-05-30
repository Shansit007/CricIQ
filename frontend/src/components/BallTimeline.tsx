// ============================================
// BallTimeline.tsx — Horizontal ball-by-ball timeline
// Each ball is a colored bubble. Hover to see details.
// ============================================

import { useRef, useEffect } from 'react';
import type { BallEvent } from '../types/cricket';

interface BallTimelineProps {
  balls: BallEvent[];   // array of all balls so far in the match
}

export default function BallTimeline({ balls }: BallTimelineProps) {
  // ref for the scrollable container — we auto-scroll to the latest ball
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to rightmost ball whenever new ball is added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [balls.length]);   // runs every time the number of balls changes

  // ---- Helper: pick bubble color based on ball type ----
  const getBallColor = (ball: BallEvent): string => {
    if (ball.is_wicket)           return 'bg-accent-red text-white';          // red — OUT!
    if (ball.runs_this_ball === 6) return 'bg-accent-gold text-gray-900';     // gold — SIX!
    if (ball.runs_this_ball === 4) return 'bg-blue-500 text-white';           // blue — FOUR!
    if (ball.runs_this_ball >= 1) return 'bg-green-600 text-white';           // green — runs
    return 'bg-gray-700 text-gray-300';                                        // gray — dot ball
  };

  // ---- Helper: label inside bubble ----
  const getBallLabel = (ball: BallEvent): string => {
    if (ball.is_wicket)            return 'W';                    // W for wicket
    if (ball.runs_this_ball === 0) return '•';                    // dot for 0
    return String(ball.runs_this_ball);                           // show runs
  };

  // Group balls by over for visual separation
  // Returns array of overs, each over has its balls
  const groupByOver = (): { over: number; balls: BallEvent[] }[] => {
    const groups: { [key: number]: BallEvent[] } = {};
    balls.forEach((ball) => {
      if (!groups[ball.over]) groups[ball.over] = [];
      groups[ball.over].push(ball);
    });
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .map((over) => ({ over, balls: groups[over] }));
  };

  const overs = groupByOver();

  return (
    <div className="criciq-card overflow-hidden">
      <p className="text-text-secondary text-xs uppercase tracking-widest font-semibold mb-3">
        Ball by Ball
      </p>

      {/* Scrollable horizontal strip */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Show empty state if no balls yet */}
        {balls.length === 0 && (
          <p className="text-text-secondary text-sm py-2">Waiting for first ball...</p>
        )}

        {/* Render each over as a group */}
        {overs.map(({ over, balls: overBalls }) => (
          <div key={over} className="flex-shrink-0 flex flex-col items-center gap-1">
            {/* Over number label */}
            <span className="text-xs text-text-secondary font-mono">Ov {over + 1}</span>

            {/* Balls in this over */}
            <div className="flex gap-1">
              {overBalls.map((ball, idx) => (
                <div
                  key={idx}
                  className="relative group"   // 'group' lets us show tooltip on hover
                >
                  {/* The ball bubble */}
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      text-xs font-bold cursor-default select-none
                      transition-transform duration-150 hover:scale-125
                      ${getBallColor(ball)}
                      ${ball.is_wicket ? 'ring-2 ring-red-400 ring-offset-1 ring-offset-bg-card' : ''}
                    `}
                    style={
                      ball.runs_this_ball === 6
                        ? { boxShadow: '0 0 8px rgba(244,167,3,0.6)' }  // glow on six
                        : ball.runs_this_ball === 4
                        ? { boxShadow: '0 0 8px rgba(37,99,235,0.6)' }  // glow on four
                        : {}
                    }
                  >
                    {getBallLabel(ball)}
                  </div>

                  {/* Tooltip — appears on hover above the bubble */}
                  <div className="
                    absolute bottom-10 left-1/2 -translate-x-1/2
                    hidden group-hover:block
                    bg-gray-900 border border-card-border rounded-lg p-2
                    text-xs text-text-primary whitespace-nowrap z-10
                    min-w-max shadow-xl
                  ">
                    {/* Over.ball notation */}
                    <p className="font-bold text-accent-cyan">{over + 1}.{ball.ball}</p>
                    {/* Runs info */}
                    <p>{ball.is_wicket ? '🔴 WICKET!' : `${ball.runs_this_ball} run${ball.runs_this_ball !== 1 ? 's' : ''}`}</p>
                    {/* Win probability */}
                    <p>Win: {Math.round(ball.win_probability * 100)}%</p>
                    {/* Commentary snippet */}
                    {ball.commentary && (
                      <p className="text-text-secondary max-w-48 whitespace-normal mt-1">{ball.commentary}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend at the bottom */}
      <div className="flex gap-4 mt-3 flex-wrap">
        {[
          { color: 'bg-gray-700', label: 'Dot' },
          { color: 'bg-green-600', label: 'Runs' },
          { color: 'bg-blue-500', label: 'Four' },
          { color: 'bg-accent-gold', label: 'Six' },
          { color: 'bg-accent-red', label: 'Wicket' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`w-3 h-3 rounded-full ${color} inline-block`} />
            <span className="text-xs text-text-secondary">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
