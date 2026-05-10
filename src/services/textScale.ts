/**
 * App-wide font scaling.
 *
 * Two scales compound:
 *
 *  1. iOS Dynamic Type — set via Settings → Accessibility → Display & Text
 *     Size → Larger Text. React Native respects this automatically on any
 *     <Text> that doesn't pass `allowFontScaling={false}` (we don't pass
 *     that anywhere, so it's already on). We cap it at 1.5x via
 *     `maxFontSizeMultiplier` so layouts on home/chart don't break at
 *     extreme system sizes.
 *
 *  2. In-app override — userStore.user.fontScale (default 1.0). Users
 *     who want larger text without changing iOS-wide settings can pick
 *     Default / Large (1.15) / Extra Large (1.3) in Profile.
 *
 * The in-app scale is applied by patching Text.render at module load:
 * every Text render multiplies its style.fontSize by the current scale
 * read from the store. Because we read from the store inside render
 * (not via a hook), changing the scale only affects subsequent renders
 * — the root layout in app/_layout.tsx keys on fontScale to force a
 * full re-render when the user changes it.
 *
 * Import this once at app boot (app/_layout.tsx).
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useAppStore } from '@store/userStore';

// Cap iOS Dynamic Type at 1.5x. Beyond that, our cards on home/chart
// overflow and the dasha track gets clipped. Users who need more scale
// should use the in-app font size setting on top of system Dynamic Type.
const TextAny = Text as any;
TextAny.defaultProps = TextAny.defaultProps || {};
TextAny.defaultProps.maxFontSizeMultiplier = 1.5;

// Module-level cache of the current scale. `useAppStore.getState()` was
// being called inside every Text.render — fast, but at default Large
// (1.15) every Text in the app goes through the clone path so this fires
// hundreds of times per screen. The subscribe call below keeps this cache
// in sync with the store; the Text patch reads the local var instead.
let _currentScale = useAppStore.getState().user.fontScale ?? 1;
useAppStore.subscribe((state) => {
  _currentScale = state.user.fontScale ?? 1;
});

// Patch Text.render exactly once. The flag is checked + set in the same
// tick to defend against double-imports on hot reload (which would
// otherwise compose the patch with itself and double-scale).
const originalRender = TextAny.render;
if (originalRender && !TextAny.__naksha_text_patched) {
  TextAny.__naksha_text_patched = true;
  TextAny.render = function patchedRender(this: any, ...args: any[]) {
    const tree = originalRender.apply(this, args);
    if (_currentScale === 1) return tree;
    const flat = StyleSheet.flatten(tree.props.style) as { fontSize?: number } | undefined;
    if (!flat?.fontSize) return tree;
    return React.cloneElement(tree, {
      style: [tree.props.style, { fontSize: flat.fontSize * _currentScale }],
    });
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type FontScaleOption = 'default' | 'large' | 'xlarge';

/** Map preset → numeric multiplier. */
export function fontScaleValue(option: FontScaleOption): number {
  switch (option) {
    case 'large': return 1.15;
    case 'xlarge': return 1.3;
    default: return 1;
  }
}

/** Reverse map for the Profile UI. */
export function fontScaleOption(value: number): FontScaleOption {
  if (value >= 1.3) return 'xlarge';
  if (value >= 1.15) return 'large';
  return 'default';
}
