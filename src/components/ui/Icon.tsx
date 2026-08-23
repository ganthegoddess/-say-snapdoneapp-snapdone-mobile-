// ─────────────────────────────────────────────────────────────
// SnapDone Mobile — custom outlined icon set (DESIGN-SYSTEM §2)
// One custom outlined set drawn to a single grid: 1.5px stroke,
// round line caps/joins, friendly rounded corners — NEVER emojis.
// Single source (Code Hygiene): every glyph lives here + icons.ts.
// Color is single-tint by context (teal primary/active, muted
// slate inactive, white on gradient).
// ─────────────────────────────────────────────────────────────
import React from "react";
import Svg, { Path, Circle, Rect, Line, Polyline, Ellipse, G } from "react-native-svg";
import type { ViewStyle, StyleProp } from "react-native";

export type IconName =
  | "mic"
  | "camera"
  | "note"
  | "upload"
  | "search"
  | "chevron"
  | "chevronRight"
  | "close"
  | "check"
  | "plus"
  | "share"
  | "warning"
  | "privacy"
  | "storage"
  | "notifications"
  | "household"
  | "home"
  | "vault"
  | "settings"
  | "mail"
  | "sparkle";

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** inline flex enable for centred groups (Home stacked buttons) */
  style?: StyleProp<ViewStyle>;
}

const S = 24; // viewBox grid
const W = 4; // HEAVY custom stroke (~0.17×s) — owner v6 (was 1.5 / 0.12×s thin line work)

function stroke(color: string) {
  return {
    stroke: color,
    strokeWidth: W,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
    fillOpacity: 0,
  };
}

/** Glyph path map — one implementation per glyph. */
export const ICON_PATHS: Record<IconName, (c: string, k: number) => React.ReactNode> = {
  mic: (c, k) => (
    // VOICE — chunky rounded capsule + stand + base + pickup arc (owner v6 heavy)
    <G {...stroke(c)} key={k}>
      <Rect x={8.7} y={2.8} width={6.6} height={13.2} rx={3.3} />
      <Line x1={12} y1={16} x2={12} y2={19.4} />
      <Line x1={7.8} y1={19.4} x2={16.2} y2={19.4} />
      <Path d="M8.7 15.6a3.3 4 0 0 0 6.6 0" />
    </G>
  ),
  camera: (c, k) => (
    // SNAP — chunky camera: rounder body + big lens + top bump (owner v6 heavy)
    <G {...stroke(c)} key={k}>
      <Rect x={3.4} y={6.2} width={17.2} height={13.2} rx={3.6} />
      <Circle cx={12} cy={12.4} r={4} />
      <Path d="M8 6.4V4.9A1.5 1.5 0 0 1 9.5 3.4h5A1.5 1.5 0 0 1 16 4.9v1.5" />
    </G>
  ),
  note: (c, k) => (
    // TYPE IT — chunky upright pencil: barrel + eraser top + wood tip (owner v6 heavy)
    <G {...stroke(c)} key={k}>
      <Rect x={8.4} y={2.8} width={7.2} height={12.8} rx={1.9} />
      <Rect x={8.4} y={2.8} width={7.2} height={3.4} rx={1.6} />
      <Line x1={8.4} y1={15.6} x2={12} y2={21.2} />
      <Line x1={15.6} y1={15.6} x2={12} y2={21.2} />
    </G>
  ),
  upload: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Path d="M12 16V5" />
      <Polyline points="7 10 12 5 17 10" />
      <Path d="M5 20h14" />
    </G>
  ),
  search: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Circle cx={11} cy={11} r={6.5} />
      <Line x1={16} y1={16} x2={20.5} y2={20.5} />
    </G>
  ),
  chevron: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Polyline points="9 6 15 12 9 18" />
    </G>
  ),
  chevronRight: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Polyline points="6 9 12 15 18 9" />
    </G>
  ),
  close: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Line x1={6} y1={6} x2={18} y2={18} />
      <Line x1={18} y1={6} x2={6} y2={18} />
    </G>
  ),
  check: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Polyline points="4.5 12.5 10 18 19.5 6.5" />
    </G>
  ),
  plus: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Line x1={12} y1={5} x2={12} y2={19} />
      <Line x1={5} y1={12} x2={19} y2={12} />
    </G>
  ),
  share: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Path d="M12 3v11" />
      <Polyline points="7 8 12 3 17 8" />
      <Path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </G>
  ),
  warning: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Path d="M12 4 2.5 20h19L12 4z" />
      <Line x1={12} y1={10} x2={12} y2={14} />
      <Circle cx={12} cy={17.2} r={0.6} fill={c} stroke="none" />
    </G>
  ),
  privacy: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Rect x={5} y={10} width={14} height={10} rx={2} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <Circle cx={12} cy={15} r={1.6} />
    </G>
  ),
  storage: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Ellipse cx={12} cy={5.5} rx={7} ry={2.5} />
      <Path d="M5 5.5v7c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-7" />
      <Path d="M5 12.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </G>
  ),
  notifications: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
      <Path d="M10 20a2.2 2.2 0 0 0 4 0" />
    </G>
  ),
  household: (c, k) => (
    // premium four-person glyph (adults center, children sides) — grayscale tint
    <G {...stroke(c)} key={k}>
      <Circle cx={9.5} cy={7.5} r={2.3} />
      <Path d="M6.2 15.5c.6-2.3 1.7-3.2 3.3-3.2s2.7.9 3.3 3.2" />
      <Circle cx={14.5} cy={7.5} r={2.3} />
      <Path d="M11.2 15.5c.6-2.3 1.7-3.2 3.3-3.2s2.7.9 3.3 3.2" />
      <Circle cx={5} cy={11} r={1.7} />
      <Path d="M3.4 15.5c.3-1.4 1-2 2-2s1.7.6 2 2" />
      <Circle cx={19} cy={11} r={1.7} />
      <Path d="M17.4 15.5c.3-1.4 1-2 2-2s1.7.6 2 2" />
    </G>
  ),
  home: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Path d="M4 11 12 4l8 7" />
      <Path d="M6 10v9a1 1 0 0 0 1 1h4v-5h2v5h4a1 1 0 0 0 1-1v-9" />
    </G>
  ),
  vault: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Path d="M3 9h18" />
      <Path d="M7 9v7M12 9v7M17 9v7" />
    </G>
  ),
  settings: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 2.5v2M12 19.5v2M19.5 12h-2M6.5 12h-2M17.7 6.3l-1.4 1.4M7.7 16.3l-1.4 1.4M17.7 17.7l-1.4-1.4M7.7 7.7 6.3 6.3" />
    </G>
  ),
  mail: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Polyline points="3 7 12 13 21 7" />
    </G>
  ),
  sparkle: (c, k) => (
    <G {...stroke(c)} key={k}>
      <Path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
      <Path d="M7.5 7.5l1 1M15.5 15.5l1 1M7.5 16.5l1-1M15.5 8.5l1-1" />
    </G>
  ),
};

/**
 * Icon — a single custom outlined glyph. Resolves to the icon map.
 * Same stroke weight / corner radius / color palette everywhere.
 */
export function Icon({ name, size = 22, color = "#0891B2", style }: IconProps) {
  const kind = ICON_PATHS[name];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${S} ${S}`} style={style}>
      {kind(color, 0)}
    </Svg>
  );
}

export default Icon;
