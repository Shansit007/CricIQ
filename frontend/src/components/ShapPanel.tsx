// ============================================
// ShapPanel.tsx — "Why This Prediction?" explainability panel
// Shows top SHAP features as a horizontal bar chart
// ============================================

import type { ShapFeature } from '../types/cricket';

interface ShapPanelProps {
  features: ShapFeature[];  // top 5 features from backend
  battingTeam: string;
}

export default function ShapPanel({ features, battingTeam }: ShapPanelProps) {
  if (!features || features.length === 0) return null;  // don't render if no data

  // Find the maximum absolute impact — used to scale bars to 100%
  const maxImpact = Math.max(...features.map((f) => Math.abs(f.impact)));

  return (
    <div className="criciq-card">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-accent-cyan text-lg">🔍</span>
        <div>
          <p className="text-text-primary font-semibold text-sm">Why This Prediction?</p>
          <p className="text-text-secondary text-xs">Top factors affecting {battingTeam}'s win probability</p>
        </div>
      </div>

      {/* Feature bars */}
      <div className="space-y-3">
        {features.map((feature, idx) => {
          // Calculate bar width as % of max impact
          const barWidth = (Math.abs(feature.impact) / maxImpact) * 100;
          const isPositive = feature.impact >= 0;  // positive = boosts win prob
          const barColor = isPositive ? '#00D4FF' : '#FF4B4B';  // cyan vs red

          return (
            <div key={idx} className="group">
              {/* Feature name row */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-text-primary text-sm">{feature.name}</span>
                <div className="flex items-center gap-2">
                  {/* The actual value (e.g. "7 wickets") */}
                  <span className="text-text-secondary text-xs">{feature.value}</span>
                  {/* Impact percentage */}
                  <span
                    className="text-xs font-bold"
                    style={{ color: barColor }}
                  >
                    {isPositive ? '+' : ''}{(feature.impact * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Bar chart row */}
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                {/* The bar — width based on impact magnitude */}
                <div
                  className="absolute top-0 h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: barColor,
                    left: isPositive ? '50%' : `calc(50% - ${barWidth / 2}%)`,  // grow from center
                    boxShadow: `0 0 6px ${barColor}88`,
                  }}
                />
                {/* Center line */}
                <div className="absolute left-1/2 top-0 h-full w-px bg-gray-600" />
              </div>

              {/* Tooltip text (appears on hover) */}
              <p className="text-text-secondary text-xs mt-1 hidden group-hover:block">
                {isPositive
                  ? `${feature.name} is boosting win probability by ${(feature.impact * 100).toFixed(1)}%`
                  : `${feature.name} is reducing win probability by ${Math.abs(feature.impact * 100).toFixed(1)}%`
                }
              </p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 pt-3 border-t border-card-border">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-accent-cyan" />
          <span className="text-text-secondary text-xs">Boosts win probability</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-accent-red" />
          <span className="text-text-secondary text-xs">Reduces win probability</span>
        </div>
      </div>
    </div>
  );
}
