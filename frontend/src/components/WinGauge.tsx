// ============================================
// WinGauge.tsx — Animated semicircle win probability gauge
// Shows which team is winning and by how much
// ============================================

import { useEffect, useRef } from 'react';

interface WinGaugeProps {
  probability: number;    // 0.0 to 1.0 — batting team win probability
  battingTeam: string;    // name of team currently batting
  bowlingTeam: string;    // name of team currently bowling
  momentum?: number;      // positive = batting gaining, negative = bowling gaining
}

export default function WinGauge({ probability, battingTeam, bowlingTeam, momentum = 0 }: WinGaugeProps) {
  // ref gives us direct access to the SVG needle element for animation
  const needleRef = useRef<SVGLineElement>(null);
  const prevProbRef = useRef<number>(probability);

  // ---- Animate needle when probability changes ----
  useEffect(() => {
    const needle = needleRef.current;
    if (!needle) return;

    // Convert probability (0–1) to angle (-90° to +90°)
    // -90° = far left (batting team 0%), +90° = far right (batting team 100%)
    const angle = (probability * 180) - 90;

    // Smooth CSS transition for the needle rotation
    needle.style.transition = 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
    needle.style.transformOrigin = '120px 120px';   // rotate around center
    needle.style.transform = `rotate(${angle}deg)`;

    prevProbRef.current = probability;
  }, [probability]);

  // ---- Helper: pick gauge color based on batting team probability ----
  // Red = they're losing (< 30%), Yellow = even (30–60%), Green = winning (> 60%)
  const getGaugeColor = (prob: number): string => {
    if (prob < 0.30) return '#FF4B4B';    // red — batting team likely to lose
    if (prob < 0.60) return '#F4A703';    // gold — even contest
    return '#00D4FF';                      // cyan — batting team likely to win
  };

  const color = getGaugeColor(probability);
  const percent = Math.round(probability * 100);

  // ---- SVG arc using strokeDasharray trick ----
  // Draw a full semicircle, then use dasharray to "fill" only the probability portion
  // This is the cleanest approach — no arc math bugs
  const cx = 120, cy = 120, r = 80;

  // Circumference of a full circle = 2πr, but we only want the top semicircle = πr
  const semicircumference = Math.PI * r;   // ~251px for r=80

  // How much of the semicircle to fill = probability * full semicircle length
  const filledLength = probability * semicircumference;
  const gapLength    = semicircumference - filledLength;

  // The arc path — a simple semicircle from left to right
  const bgArcPath  = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  const fillArcPath = bgArcPath;  // same path, different strokeDasharray

  // ---- Needle position ----
  // Needle starts at center and points toward the probability position
  const needleAngleDeg = (probability * 180) - 90;  // -90° to +90°
  const needleAngleRad = (needleAngleDeg * Math.PI) / 180;
  const needleLength = 65;
  const nx = cx + needleLength * Math.cos(needleAngleRad - Math.PI / 2);
  const ny = cy + needleLength * Math.sin(needleAngleRad - Math.PI / 2);

  // ---- Momentum arrow direction ----
  const momentumArrow = momentum > 0.05 ? '↑' : momentum < -0.05 ? '↓' : '→';
  const momentumColor = momentum > 0.05 ? '#00D4FF' : momentum < -0.05 ? '#FF4B4B' : '#9CA3AF';

  return (
    <div className="criciq-card flex flex-col items-center gap-2">
      {/* Title */}
      <p className="text-text-secondary text-xs uppercase tracking-widest font-semibold">Win Probability</p>

      {/* SVG Gauge */}
      <div className="relative">
        <svg width="240" height="140" viewBox="0 0 240 140">
          {/* Background arc (full semicircle, gray) */}
          <path
            d={bgArcPath}
            fill="none"
            stroke="#1F2937"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Colored arc — fills from left up to current probability using dasharray */}
          <path
            d={fillArcPath}
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${semicircumference}`}
            style={{
              filter: `drop-shadow(0 0 6px ${color}88)`,
              transition: 'stroke-dasharray 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />

          {/* Needle */}
          <line
            ref={needleRef}
            x1={cx}
            y1={cy}
            x2={nx}
            y2={ny}
            stroke="#E8EAF0"
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${needleAngleDeg}deg)`,
              transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />

          {/* Center dot */}
          <circle cx={cx} cy={cy} r="6" fill={color} />

          {/* Percentage text inside the gauge */}
          <text
            x={cx}
            y={cy - 20}
            textAnchor="middle"
            fill={color}
            fontSize="28"
            fontFamily="'Bebas Neue', cursive"
            fontWeight="bold"
          >
            {percent}%
          </text>

          {/* 0% label */}
          <text x="20" y="130" fill="#4B5563" fontSize="10" fontFamily="Inter">0%</text>

          {/* 50% label */}
          <text x="114" y="50" fill="#4B5563" fontSize="10" fontFamily="Inter">50%</text>

          {/* 100% label */}
          <text x="200" y="130" fill="#4B5563" fontSize="10" fontFamily="Inter">100%</text>
        </svg>
      </div>

      {/* Team names on either side */}
      <div className="flex justify-between w-full px-2">
        {/* Bowling team on left (their win probability = 100 - percent) */}
        <div className="text-center">
          <p className="text-xs text-text-secondary">🎯 Bowling</p>
          <p className="text-sm font-bold text-text-primary">{bowlingTeam}</p>
          <p className="text-lg font-display" style={{ color: '#FF4B4B', fontFamily: "'Bebas Neue', cursive" }}>
            {100 - percent}%
          </p>
        </div>

        {/* Momentum indicator in center */}
        <div className="text-center flex flex-col items-center justify-center">
          <p className="text-xs text-text-secondary">Momentum</p>
          <span className="text-2xl" style={{ color: momentumColor }}>{momentumArrow}</span>
          <p className="text-xs" style={{ color: momentumColor }}>
            {momentum > 0 ? '+' : ''}{(momentum * 100).toFixed(1)}%
          </p>
        </div>

        {/* Batting team on right */}
        <div className="text-center">
          <p className="text-xs text-text-secondary">🏏 Batting</p>
          <p className="text-sm font-bold text-text-primary">{battingTeam}</p>
          <p className="text-lg font-display" style={{ color, fontFamily: "'Bebas Neue', cursive" }}>
            {percent}%
          </p>
        </div>
      </div>
    </div>
  );
}
