// ============================================
// MomentumChart.tsx — Win probability trend (last 30 balls)
// Area chart showing how win probability changed over time
// ============================================

// AreaChart and friends come from recharts (free charting library)
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { BallEvent } from '../types/cricket';

interface MomentumChartProps {
  balls: BallEvent[];
  battingTeam: string;
}

// Custom tooltip component — shown when user hovers over the chart
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;  // don't show if not hovering

  const data = payload[0].payload as BallEvent;
  return (
    <div className="criciq-card py-2 px-3 text-xs space-y-1 shadow-xl">
      <p className="text-accent-cyan font-bold">Over {data.over + 1}.{data.ball}</p>
      <p className="text-text-primary">Win: {Math.round(data.win_probability * 100)}%</p>
      {data.is_wicket && <p className="text-accent-red font-bold">🔴 WICKET!</p>}
      {data.runs_this_ball === 6 && <p className="text-accent-gold font-bold">💥 SIX!</p>}
      {data.runs_this_ball === 4 && <p className="text-blue-400 font-bold">⚡ FOUR!</p>}
    </div>
  );
}

// Custom dot on chart — bigger dots for special deliveries
function CustomDot(props: any) {
  const { cx, cy, payload } = props;

  if (payload.is_wicket)              return <circle cx={cx} cy={cy} r={5} fill="#FF4B4B" stroke="none" />;
  if (payload.runs_this_ball === 6)   return <circle cx={cx} cy={cy} r={5} fill="#F4A703" stroke="none" />;
  if (payload.runs_this_ball === 4)   return <circle cx={cx} cy={cy} r={4} fill="#3B82F6" stroke="none" />;
  return null;  // no dot for regular balls — keeps chart clean
}

export default function MomentumChart({ balls, battingTeam }: MomentumChartProps) {
  // Only show last 30 balls to keep chart readable
  const recentBalls = balls.slice(-30);

  // Transform ball data for recharts
  // recharts needs an array of plain objects
  const chartData = recentBalls.map((ball) => ({
    ...ball,
    // Convert probability to percentage (0–100)
    prob: Math.round(ball.win_probability * 100),
    // X-axis label: "14.3" style
    label: `${ball.over + 1}.${ball.ball}`,
  }));

  return (
    <div className="criciq-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-text-secondary text-xs uppercase tracking-widest font-semibold">
          Win Probability — Last 30 Balls
        </p>
        <span className="text-xs text-text-secondary">{battingTeam} batting</span>
      </div>

      {/* Empty state */}
      {balls.length === 0 && (
        <div className="h-32 flex items-center justify-center">
          <p className="text-text-secondary text-sm">Waiting for match data...</p>
        </div>
      )}

      {/* The chart — only renders when we have data */}
      {balls.length > 0 && (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            {/* Gradient fill definition */}
            <defs>
              <linearGradient id="winGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00D4FF" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00D4FF" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            {/* 50% reference line — even odds */}
            <ReferenceLine y={50} stroke="#374151" strokeDasharray="3 3" />

            {/* X axis — over.ball labels */}
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"  // only show first and last label
            />

            {/* Y axis — 0 to 100% */}
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />

            {/* Hover tooltip */}
            <Tooltip content={<CustomTooltip />} />

            {/* The main area curve */}
            <Area
              type="monotone"          // smooth curve
              dataKey="prob"           // which field to plot
              stroke="#00D4FF"         // line color
              strokeWidth={2}
              fill="url(#winGradient)" // gradient fill under line
              dot={<CustomDot />}      // custom dots for special deliveries
              animationDuration={300}  // smooth animation on new data
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
