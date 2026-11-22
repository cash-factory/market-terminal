export const PANEL_MIN_WIDTH = 220;
export const PANEL_MAX_WIDTH = 460;
export const PANEL_DEFAULT_WIDTH = 270;

/** Keep the watchlist usable on laptop screens and avoid unbounded panel widths. */
export function clampPanelWidth(value: number): number {
  if (!Number.isFinite(value)) return PANEL_DEFAULT_WIDTH;
  return Math.round(Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, value)));
}

/** Dragging the panel's left border leftwards makes it wider. */
export function panelWidthAfterDrag(startWidth: number, startX: number, currentX: number): number {
  return clampPanelWidth(startWidth + startX - currentX);
}

export function panelWidthAfterKey(width: number, key: string): number {
  if (key === "ArrowLeft") return clampPanelWidth(width + 16);
  if (key === "ArrowRight") return clampPanelWidth(width - 16);
  if (key === "Home") return PANEL_MIN_WIDTH;
  if (key === "End") return PANEL_MAX_WIDTH;
  return clampPanelWidth(width);
}
