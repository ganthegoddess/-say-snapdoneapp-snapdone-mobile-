// ─────────────────────────────────────────────────────────────
// SnapDone Mobile — custom icon set (DESIGN-SYSTEM §2)
// Two families, single source (Code Hygiene: every glyph here +
// icons.ts), single tint by context (teal primary, muted inactive,
// white on gradient) — NEVER emojis.
//   • PREMIUM FILLED (owner v6.1, the definitive icon language):
//     solid refined glyph silhouettes — camera (Snap), mic
//     (Tell me), pencil (Type it), album (Library), upload
//     (capture only), household (four-person). Confident mass,
//     crisp edges, balanced negative-space cuts. NOT thin, NOT
//     heavy/chunky, NOT hand-drawn. Rendered ~0.73×h.
//   • CUSTOM OUTLINED (general UI): 1.5px stroke, round
//     caps/joins, friendly rounded corners (search, chevron,
//     close, check, plus, share, warning, privacy, storage,
//     notifications, home, vault, settings, mail, sparkle).
// ─────────────────────────────────────────────────────────────
import React from "react";
import Svg, { Path, Circle, Rect, Line, Polyline, Ellipse, Polygon, G } from "react-native-svg";
import type { ViewStyle, StyleProp } from "react-native";

export type IconName =
  | "mic"
  | "camera"
  | "note"
  | "album"
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
// Custom OUTLINED general-UI stroke weight (DESIGN-SYSTEM §2: 1.5px / 0.12×s,
// round caps/joins). Premium capture/affordance glyphs are FILLED (see below).
const W = 1.5;

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
  // ── PREMIUM FILLED set (owner v6.1) ────────────────────────────
  mic: (c, k) => (
    // TELL ME — refined filled microphone: capsule + stem + base
    <G fill={c} stroke="none" key={k}>
      <Rect x={9.4} y={5.4} width={5.2} height={8.4} rx={2.6} />
      <Rect x={11.2} y={13.8} width={1.6} height={2.2} />
      <Rect x={7.3} y={13.8} width={9.4} height={4.0} rx={1.8} />
    </G>
  ),
  camera: (c, k) => (
    // SNAP — refined filled camera: body w/ negative-space lens ring + top bump
    <G key={k}>
      <Path
        fill={c}
        stroke="none"
        fillRule="evenodd"
        d="M7.7 8.4 H16.3 A2.6 2.6 0 0 1 18.9 11.0 V11.2 A2.6 2.6 0 0 1 16.3 13.8 H7.7 A2.6 2.6 0 0 1 5.1 11.2 V11.0 A2.6 2.6 0 0 1 7.7 8.4 Z M9.5 12.2 a2.5 2.5 0 1 0 5.0 0 a2.5 2.5 0 1 0 -5.0 0 Z"
      />
      <Polygon fill={c} stroke="none" points="10.2,8.4 10.9,6.9 13.1,6.9 13.8,8.4" />
      <Circle cx={12} cy={12.2} r={1.0} fill={c} stroke="none" />
    </G>
  ),
  note: (c, k) => (
    // TYPE IT — refined filled pencil: body w/ ferrule gap + diagonal tip
    <G fill={c} stroke="none" key={k}>
      <Rect x={9.1} y={5.8} width={5.8} height={1.1} rx={1.0} />
      <Rect x={9.1} y={7.5} width={5.8} height={5.9} rx={1.1} />
      <Polygon points="9.1,13.4 14.9,13.4 12.0,18.2" />
    </G>
  ),
  album: (c, k) => (
    // LIBRARY — refined filled stacked photo frames (back + front + detail dot)
    <G fill={c} stroke="none" key={k}>
      <Rect x={6.5} y={8.0} width={9.5} height={5.8} rx={1.8} />
      <Rect x={9.1} y={9.4} width={9.5} height={8.1} rx={1.8} />
      <Circle cx={13.8} cy={12.0} r={1.3} />
    </G>
  ),
  upload: (c, k) => (
    // UPLOAD (advanced/capture only) — refined filled tray + up arrow
    <G fill={c} stroke="none" key={k}>
      <Polygon points="12.0,6.2 8.4,11.3 15.6,11.3" />
      <Rect x={11.2} y={10.9} width={1.6} height={4.8} />
      <Rect x={6.2} y={15.7} width={11.6} height={2.1} rx={1.05} />
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
    // HOUSEHOLD — premium filled four-person FAMILY glyph (2 adults center, child each side) — grayscale tint
    <G fill={c} stroke="none" key={k}>
      {/* adults (center) */}
      <Circle cx={9.45} cy={9.1} r={2.0} />
      <Rect x={6.7} y={9.1} width={5.5} height={2.9} rx={1.45} />
      <Circle cx={14.55} cy={9.1} r={2.0} />
      <Rect x={11.8} y={9.1} width={5.5} height={2.9} rx={1.45} />
      {/* children (sides) */}
      <Circle cx={6.5} cy={10.5} r={1.45} />
      <Rect x={4.4} y={10.5} width={4.2} height={2.1} rx={1.05} />
      <Circle cx={17.5} cy={10.5} r={1.45} />
      <Rect x={15.4} y={10.5} width={4.2} height={2.1} rx={1.05} />
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
