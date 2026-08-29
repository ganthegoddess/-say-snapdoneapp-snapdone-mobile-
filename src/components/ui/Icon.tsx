// ─────────────────────────────────────────────────────────────
// SnapDone Mobile — custom icon set (DESIGN-SYSTEM §2 · OWNER LOCK B)
// ONE filled family, single source (Code Hygiene: every glyph here +
// icons.ts), single tint by context (teal primary, muted inactive,
// white on gradient) — NEVER emojis (except the 4 premium tab-bar
// emojis + the Household glyph).
//   • PREMIUM FILLED (owner v6.1): solid refined glyph silhouettes —
//     camera (Snap), mic (Tell me), note (Type it), album (Library),
//     upload (capture only), household (2×2 full-silhouette family).
//   • GENERAL-UI FILLED (owner lock B, Aug 26): the deck's FILLED refined
//     set — home, vault, settings, search, chevron, chevronRight, close,
//     check, plus, share, warning, privacy, storage, notifications, mail,
//     sparkle. Solid silhouettes, crisp edges, balanced negative-space
//     cuts (fillRule="evenodd" true transparency — never a white fill).
// ─────────────────────────────────────────────────────────────
import React from "react";
import Svg, { Path, Circle, Rect, Polygon, G } from "react-native-svg";
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

/** Glyph path map — one implementation per glyph (single source). */
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
  household: (c, k) => (
    // HOUSEHOLD — filled 2×2 full-silhouette family (OWNER LOCK B, deck/mockup
    // parity): two larger ADULTS on top, two smaller CHILDREN below on the outer
    // sides, shoulders continuous into ONE unified filled family mark — not a
    // scatter of circles. Grayscale tint in both tab states.
    <G fill={c} stroke="none" key={k}>
      {/* adults — top row */}
      <Circle cx={8.2} cy={5.4} r={4.3} />
      <Rect x={5.7} y={5.4} width={5.0} height={6.5} rx={1.9} />
      <Circle cx={15.8} cy={5.4} r={4.3} />
      <Rect x={13.3} y={5.4} width={5.0} height={6.5} rx={1.9} />
      {/* children — bottom row, outer sides */}
      <Circle cx={3.9} cy={14.4} r={3.4} />
      <Rect x={1.9} y={14.4} width={4.0} height={6.6} rx={1.3} />
      <Circle cx={20.1} cy={14.4} r={3.4} />
      <Rect x={18.1} y={14.4} width={4.0} height={6.6} rx={1.3} />
      {/* connecting fill — unified silhouette */}
      <Rect x={7.6} y={14.4} width={8.8} height={1.5} />
    </G>
  ),

  // ── GENERAL-UI FILLED set (owner lock B — deck's refined glyphs) ──
  home: (c, k) => (
    <G key={k}>
      <Polygon fill={c} points="12,3.8 20.8,10.4 3.2,10.4" />
      <Path
        fill={c}
        fillRule="evenodd"
        d="M5.6 10.4 H18.4 V20.4 H5.6 Z M9.9 13.6 H14.1 V20.4 H9.9 Z"
      />
    </G>
  ),
  vault: (c, k) => (
    <Path
      key={k}
      fill={c}
      fillRule="evenodd"
      d="M6.5 5.5 H17.5 A2.5 2.5 0 0 1 20 8 V16 A2.5 2.5 0 0 1 17.5 18.5 H6.5 A2.5 2.5 0 0 1 4 16 V8 A2.5 2.5 0 0 1 6.5 5.5 Z M8.2 10.2 H15.8 V11.9 H8.2 Z M8.2 13.3 H12.6 V15 H8.2 Z"
    />
  ),
  settings: (c, k) => (
    <G key={k}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <Rect
          key={a}
          x={10.55}
          y={3.7}
          width={2.9}
          height={3.4}
          rx={1.0}
          fill={c}
          transform={`rotate(${a} 12 12)`}
        />
      ))}
      <Path
        fill={c}
        fillRule="evenodd"
        d="M12 4.7 a7.3 7.3 0 1 0 0.001 0 Z M12 9.6 a2.4 2.4 0 1 1 -0.001 0 Z"
      />
    </G>
  ),
  search: (c, k) => (
    <G key={k}>
      <Path
        fill={c}
        fillRule="evenodd"
        d="M10.5 3.7 a6.8 6.8 0 1 0 0.001 0 Z M10.5 7.2 a3.3 3.3 0 1 1 -0.001 0 Z"
      />
      <Rect
        x={15.1}
        y={14.6}
        width={4.6}
        height={3.3}
        rx={1.65}
        fill={c}
        transform="rotate(45 17.4 16.25)"
      />
    </G>
  ),
  chevron: (c, k) => (
    <Polygon key={k} fill={c} points="8.3,5.6 16.6,12 8.3,18.4" />
  ),
  chevronRight: (c, k) => (
    <Polygon key={k} fill={c} points="9,5.6 17.4,12 9,18.4" />
  ),
  close: (c, k) => (
    <G key={k}>
      <Rect x={5.35} y={11.05} width={13.3} height={1.9} rx={0.95} fill={c} transform="rotate(45 12 12)" />
      <Rect x={5.35} y={11.05} width={13.3} height={1.9} rx={0.95} fill={c} transform="rotate(-45 12 12)" />
    </G>
  ),
  check: (c, k) => (
    <Path
      key={k}
      fill={c}
      d="M4.6 13 a1.8 1.8 0 0 1 2.6 0 l2.4 2.5 7.3 -7.6 a1.8 1.8 0 1 1 2.6 2.5 L10.9 19.4 a1.8 1.8 0 0 1 -2.6 0 L4.6 15.6 a1.8 1.8 0 0 1 0 -2.6 Z"
    />
  ),
  plus: (c, k) => (
    <Path
      key={k}
      fill={c}
      fillRule="evenodd"
      d="M12 4.6 a1.9 1.9 0 0 1 1.9 1.9 V10.1 H18.5 a1.9 1.9 0 0 1 0 3.8 H13.9 V18.5 a1.9 1.9 0 0 1 -3.8 0 V13.9 H5.5 a1.9 1.9 0 0 1 0 -3.8 H10.1 V6.5 A1.9 1.9 0 0 1 12 4.6 Z"
    />
  ),
  share: (c, k) => (
    <G key={k}>
      <Polygon fill={c} points="12,3.8 17.6,8.8 13,8.8 13,15 11,15 11,8.8 6.4,8.8" />
      <Rect x={4.4} y={17.4} width={15.2} height={2.5} rx={1.25} fill={c} />
    </G>
  ),
  warning: (c, k) => (
    <Path
      key={k}
      fill={c}
      fillRule="evenodd"
      d="M12 3.8 20.4 18.4 H3.6 Z M10.8 9.2 H13.2 V13.4 H10.8 Z M10.7 15.2 a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0 Z"
    />
  ),
  privacy: (c, k) => (
    <Path
      key={k}
      fill={c}
      fillRule="evenodd"
      d="M12 3.6 19.2 6.2 V10.6 L12 20.4 4.8 10.6 V6.2 Z M10.8 10.3 a2.15 2.15 0 0 1 2.4 0 l0.8 -1.1 a3.6 3.6 0 0 0 -4 0 Z M12 11.3 a2.4 2.4 0 0 0 -2.4 2.4 a2.4 2.4 0 0 0 4.8 0 a2.4 2.4 0 0 0 -2.4 -2.4 Z"
    />
  ),
  storage: (c, k) => (
    <Path
      key={k}
      fill={c}
      fillRule="evenodd"
      d="M4 7 H20 A0 0 0 0 1 20 7 V15 A4 4 0 0 1 12 19 A4 4 0 0 1 4 15 Z M4 10.6 H20 V11.9 H4 Z M4 13.6 H20 V14.9 H4 Z"
    />
  ),
  notifications: (c, k) => (
    <G key={k}>
      <Circle fill={c} cx={12} cy={3.3} r={0.9} />
      <Path
        fill={c}
        d="M12 4.6 C17 4.6 19.6 7.9 19.6 11.4 V13.2 A2.2 2.2 0 0 1 17.4 15.4 H6.6 A2.2 2.2 0 0 1 4.4 13.2 V11.4 C4.4 7.9 7 4.6 12 4.6 Z"
      />
      <Circle fill={c} cx={12} cy={17.6} r={1.9} />
    </G>
  ),
  mail: (c, k) => (
    <Path
      key={k}
      fill={c}
      fillRule="evenodd"
      d="M4.5 7 H19.5 A2.5 2.5 0 0 1 22 9.5 V16.5 A2.5 2.5 0 0 1 19.5 19 H4.5 A2.5 2.5 0 0 1 2 16.5 V9.5 A2.5 2.5 0 0 1 4.5 7 Z M4.5 8.4 L12 13.4 L19.5 8.4 L16.6 8.4 L12 11.4 L7.4 8.4 Z"
    />
  ),
  sparkle: (c, k) => (
    <Path
      key={k}
      fill={c}
      d="M12 3.2 L14.4 9.6 L20.8 12 L14.4 14.4 L12 20.8 L9.6 14.4 L3.2 12 L9.6 9.6 Z"
    />
  ),
};

/**
 * Icon — a single custom FILLED glyph. Resolves to the icon map.
 * Single tint everywhere; WHITE inside filled gradient buttons.
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
