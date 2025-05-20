"use client"

import React from 'react'; // Keep only necessary imports for GridRenderer
import { Size, Point } from "@/lib/utils";

interface GridRendererProps {
  zoom: number;
  panOffset: Point;
  viewportSize: Size | null;
}

const positiveModulo = (a: number, n: number): number => ((a % n) + n) % n;

// Defines the available world unit sizes for grid lines
const GRID_SCALES= [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
// Target screen size for a major grid cell.
const TARGET_PRIMARY_SCREEN_SIZE = 50; // pixels

/**
 * GridRenderer Component
 * Renders the adaptive SVG grid using patterns.
 */
const Grid: React.FC<GridRendererProps> = React.memo(({ zoom, panOffset, viewportSize }) => {
  if (!viewportSize || viewportSize.width === 0 || viewportSize.height === 0) {
    return null;
  }

  // Determine the ideal world size for primary grid lines based on current zoom
  const idealPrimaryWorldSize: number = TARGET_PRIMARY_SCREEN_SIZE / zoom;

  // Find the closest available grid scale to the ideal size.
  const primaryWorldCellSize: number = GRID_SCALES.reduce((prev, curr) =>
    Math.abs(curr - idealPrimaryWorldSize) < Math.abs(prev - idealPrimaryWorldSize) ? curr : prev
  );

  // Calculate the actual on-screen size of the grid cells.
  const primaryScreenCellSize: number = primaryWorldCellSize * zoom;
  const secondaryScreenCellSize: number = (primaryWorldCellSize / 5) * zoom;

  // Determine visibility based on on-screen cell sizes
  // Primary grid is shown if its cells are at least 1px.
  const showPrimaryGrid: boolean = primaryScreenCellSize >= 1.0;
  // Secondary grid is shown if primary is shown AND its own cells are at least 5px.
  const showSecondaryGrid: boolean = showPrimaryGrid && secondaryScreenCellSize >= 5.0;

  // Calculate the offsets for the SVG patterns to simulate grid panning.
  // These use the true calculated cell sizes for accurate modulo operations.
  const patternOffsetX: number = positiveModulo(panOffset.x, primaryScreenCellSize);
  const patternOffsetY: number = positiveModulo(panOffset.y, primaryScreenCellSize);

  const secondaryPatternOffsetX: number = positiveModulo(panOffset.x, secondaryScreenCellSize);
  const secondaryPatternOffsetY: number = positiveModulo(panOffset.y, secondaryScreenCellSize);

  const primaryStrokeWidth: number = 1 - (0.6 / Math.sqrt(zoom));
  const secondaryStrokeWidth: number = 1- (0.3 / Math.sqrt(zoom));

  return (
    <svg
      width="100%"
      height="100%"
      className="absolute top-0 left-0 pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        {/* Secondary Grid Pattern: Defined using its calculated on-screen size. */}
        {/* Its width/height will always be positive with current logic. */}
        <pattern
          id="secondaryGrid"
          width={secondaryScreenCellSize}
          height={secondaryScreenCellSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${secondaryScreenCellSize} 0 L 0 0 0 ${secondaryScreenCellSize}`}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={secondaryStrokeWidth}
          />
        </pattern>
        {/* Primary Grid Pattern: Defined using its calculated on-screen size. */}
        {/* Its width/height will always be positive. */}
        <pattern
          id="primaryGrid"
          width={primaryScreenCellSize}
          height={primaryScreenCellSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${primaryScreenCellSize} 0 L 0 0 0 ${primaryScreenCellSize}`}
            fill="none"
            stroke="rgba(0,0,0,0.15"
            strokeWidth={primaryStrokeWidth}
          />
        </pattern>
      </defs>

      {/* Background color rect */}
      <rect width="100%" height="100%" fill="rgb(249, 250, 251)" />

      {/* Conditionally render the secondary grid layer */}
      {showSecondaryGrid && (
        <rect
          x={0} y={0} width="100%" height="100%"
          fill="url(#secondaryGrid)"
          style={{ transform: `translate(${secondaryPatternOffsetX}px, ${secondaryPatternOffsetY}px)` }}
        />
      )}
      {/* Conditionally render the primary grid layer */}
      {showPrimaryGrid && (
        <rect
          x={0} y={0} width="100%" height="100%"
          fill="url(#primaryGrid)"
          style={{ transform: `translate(${patternOffsetX}px, ${patternOffsetY}px)` }}
        />
      )}
    </svg>
  );
});
Grid.displayName = "GridRenderer";

export default Grid