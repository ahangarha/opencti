# RTL (Right-to-Left) Support Implementation

## Status

Core RTL infrastructure is **implemented and functional** for Persian (fa-ir). The `@mui/stylis-plugin-rtl` automatically flips MUI component styles (margins, paddings, text-align, flex direction, etc.) when an RTL language is active.

## Architecture

### How It Works

1. **Language detection**: `useDocumentModifier.ts` sets `document.documentElement.dir = 'rtl'` when the locale is RTL
2. **Theme direction**: `AppThemeProvider.tsx` reads locale from `UserContext`, computes `direction: 'rtl' | 'ltr'`, and passes it to the theme builder functions (`ThemeDark.ts`, `ThemeLight.ts`)
3. **Emotion cache**: `RtlProvider.tsx` creates two Emotion caches — one LTR, one RTL (with `@mui/stylis-plugin-rtl`). The appropriate cache is selected based on locale, wrapped via `CacheProvider`
4. **Icon flipping**: Directional icons (chevrons, arrows) are flipped using a global CSS utility class `rtl-flip` defined in `src/static/css/index.css`

### Provider Hierarchy

```
<RtlProvider>                          // Emotion cache with RTL stylis plugin
  <ThemeProvider theme={muiTheme}>     // MUI theme with direction: 'rtl'
    {children}
  </ThemeProvider>
</RtlProvider>
```

The `RtlProvider` wraps `ThemeProvider` inside `AppThemeProvider.tsx`. Since all four root entry points (`Root.tsx`, `LoginRoot.tsx`, `PublicRoot.tsx`, `LtsLicenseRoot.tsx`) use `ConnectedThemeProvider` (which is `AppThemeProvider`), RTL support is applied everywhere automatically.

### Key Files

| File | Role |
|------|------|
| `src/utils/rtl.ts` | Shared RTL language detection (`isRtlLanguage()`) |
| `src/components/RtlProvider.tsx` | Emotion `CacheProvider` with RTL stylis plugin |
| `src/components/AppThemeProvider.tsx` | Reads locale, computes direction, wraps with `RtlProvider` |
| `src/components/ThemeDark.ts` | Accepts `direction` parameter, sets it in theme options |
| `src/components/ThemeLight.ts` | Accepts `direction` parameter, sets it in theme options |
| `src/utils/hooks/useDocumentModifier.ts` | Sets `dir="rtl"` on `<html>`, uses shared `isRtlLanguage()` |
| `src/static/css/index.css` | Global `html[dir="rtl"] .rtl-flip { transform: scaleX(-1); }` rule |

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@mui/stylis-plugin-rtl` | 9.3.0 | Flips CSS properties (margin, padding, text-align, etc.) |
| `@emotion/cache` | 11.14.0 | Creates Emotion cache instances |
| `@emotion/react` | 11.x | Provides `CacheProvider` |
| `stylis` | 4.4.0 | Peer dependency (NOT used as middleware — see below) |

### Important: Do NOT use `prefixer` from stylis

Early versions of this implementation included `import { prefixer } from 'stylis'` in the `stylisPlugins` array. This caused a runtime crash:

```
TypeError: can't access property "push", array is undefined
```

The `prefixer` from stylis v4.4.0 uses an older middleware signature incompatible with `@emotion/cache` v11.14.0. **Emotion already handles vendor prefixing internally**, so the `prefixer` is unnecessary. The correct configuration is:

```ts
const rtlCache = createCache({
  key: 'mui-rtl',
  stylisPlugins: [rtlPlugin],  // NO prefixer
});
```

## What the RTL Plugin Automatically Flips

The stylis plugin intercepts MUI's Emotion-generated CSS and flips:

- `margin-left` / `margin-right`
- `padding-left` / `padding-right`
- `text-align: left` / `text-align: right`
- `left` / `right` (in CSS positioning)
- `border-left` / `border-right`
- `float: left` / `float: right`
- Logical properties when used via `sx` prop (e.g., `px`, `mr`, `ml`)

### What It Does NOT Flip

- **Inline `style={{ }}` objects** — only `sx` prop and CSS classes are processed
- **SVG icons** — requires the `rtl-flip` CSS class or manual `transform: scaleX(-1)`
- **Logical CSS properties** (`padding-inline`, `margin-inline-start`, `inset-inline-end`) — these handle RTL natively via the browser, no flipping needed

## Icon Flipping

### CSS Utility Class

```css
/* src/static/css/index.css */
html[dir="rtl"] .rtl-flip {
  transform: scaleX(-1);
}
```

### Usage

```tsx
import ChevronRight from '@mui/icons-material/ChevronRight';

// Flips in RTL mode
<ChevronRight className="rtl-flip" />
```

### Icons That Need `rtl-flip`

Applied to directional icons that indicate navigation direction:
- `ChevronRight` / `ChevronLeft` — sidebar collapse, nested menus
- `KeyboardArrowRightOutlined` / `KeyboardArrowRight` — data table row navigation, entity lines
- `ArrowForwardIosSharp` — accordion expand
- `KeyboardArrowRight` / `KeyboardArrowLeft` — image carousel navigation
- `ChevronRightOutlined` — relationship creation continue button

### Icons That Should NOT Flip

- `ExpandMore` / `ExpandLess` / `ArrowDropDown` / `ArrowDropUp` — vertical direction, not horizontal
- `Close` / `Delete` — not directional
- Color/status icons — not directional

## Drawer/Sidebar Positioning

The NavToolbarMenu drawer uses `anchor="right"` and relies on the RTL plugin to flip it to the left in RTL mode. Do NOT set `anchor="left"` for RTL — the plugin will flip it back to right (double-negative).

The `insetInlineEnd` CSS property in the drawer is already a logical property and should NOT be flipped by the plugin. Use `/* @noflip */` if needed:

```css
/* @noflip */ insetInlineEnd: var(--chatbot-sidebar-width, 0px);
```

## Style Conversion Patterns

### Inline `style` → `sx` prop

The RTL plugin only processes styles in the `sx` prop. Convert inline styles:

```tsx
// Before (NOT flipped by RTL plugin)
<div style={{ paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}>

// After (flipped by RTL plugin)
<Box sx={{ px: 1 }}>
```

### Physical → Logical CSS properties

In `makeStyles` or CSS files, prefer logical properties:

```css
/* Before */
paddingLeft: theme.spacing(1);
paddingRight: theme.spacing(1);

/* After */
paddingInline: theme.spacing(1);
```

```css
/* Before */
right: 0;

/* After */
insetInlineEnd: 0;
```

### MUI sx shorthand

| Physical | MUI Shorthand | Logical CSS |
|----------|---------------|-------------|
| `marginLeft` / `marginRight` | `mx` | `margin-inline` |
| `paddingLeft` / `paddingRight` | `px` | `padding-inline` |
| `marginLeft` | `ml` | `margin-inline-start` |
| `marginRight` | `mr` | `margin-inline-end` |
| `paddingLeft` | `pl` | `padding-inline-start` |
| `paddingRight` | `pr` | `padding-inline-end` |

## Adding New RTL Languages

To add support for a new RTL language (e.g., Arabic `ar`, Hebrew `he`):

1. Add the language code to `RTL_LANGUAGES` in `src/utils/rtl.ts`:
   ```ts
   const RTL_LANGUAGES = new Set(['fa', 'ar', 'he']);
   ```

2. Add the language to `PlatformLang` type in `src/utils/hooks/useAuth.ts`

3. Add translation files and update `AppIntlProvider.tsx`

That's it — the RTL infrastructure handles everything else automatically.

## Remaining Work

### High Priority

- **More icon flipping**: There are additional directional icons not yet annotated with `rtl-flip`. Search for `KeyboardArrowRight`, `ChevronRight`, `ArrowForward` in the codebase to find them.
- **Testing**: Verify all MUI components render correctly in RTL — DatePicker, TimePicker, Select dropdowns, Dialog positioning, Snackbar positioning, Tooltip placement.
- **Drawer components**: Verify all `Drawer` components throughout the app handle RTL correctly. Some may need `anchor` adjustments.

### Medium Priority

- **Additional RTL languages**: Add Arabic (ar), Hebrew (he), Urdu (ur) to `RTL_LANGUAGES` when needed.
- **Runtime language switching**: Currently works (the cache swaps on locale change), but needs thorough testing for style flash or layout shift.

### Low Priority

- **Remaining inline styles**: Some components still use inline `style={{ marginLeft: ... }}` that won't be auto-flipped. These are cosmetic issues that can be fixed incrementally.
- **Print styles**: May need RTL-specific adjustments.
- **Accessibility**: Ensure screen readers announce content direction correctly.

## Testing Checklist

- [ ] Switch to Persian (fa-ir) in platform settings
- [ ] Verify main sidebar appears on the LEFT
- [ ] Verify NavToolbarMenu (secondary sidebar) appears on the LEFT
- [ ] Verify all data table rows have correct padding and arrow direction
- [ ] Verify breadcrumbs render in correct order
- [ ] Verify Tags/Chips have correct internal spacing
- [ ] Verify ItemCopy icon appears on the correct side
- [ ] Verify DatePicker opens on the correct side
- [ ] Verify Dialog/Modal components are positioned correctly
- [ ] Verify all chevron/arrow icons point in the correct direction
- [ ] Switch back to English and verify no regression
