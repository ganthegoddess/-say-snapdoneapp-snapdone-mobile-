// ─────────────────────────────────────────────────────────────
// SnapDone Mobile — icon map (DESIGN-SYSTEM §2 · one implementation)
// Re-exports the custom outlined icon set. Every icon glyph lives in
// Icon.tsx; this is the single named map the rest of the app imports
// so we never scatter ad-hoc glyphs across screens.
// ─────────────────────────────────────────────────────────────
export { Icon, ICON_PATHS } from "./Icon";
export type { IconName, IconProps } from "./Icon";
export { default } from "./Icon";
