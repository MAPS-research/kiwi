import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
import generated from '../src/theme/generated/mui-theme.json' with { type: 'json' };

// The Storybook chrome is drawn outside the app, without the token stylesheet, so it
// takes literal values: the light scheme of the generated theme (the chrome is always
// light). Accents are the accent text (--link), never primary.main: that is the Soft
// sage fill of filled controls (1.38:1 on the sheet) and would vanish as a selection,
// link or tab marker colour.
const { palette } = generated.colorSchemes.light;
const kiwi = palette._kiwi;
const radius = generated.shape.borderRadius;

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Kiwi Design System',
    brandUrl: './?path=/docs/storybook-guide-welcome--docs',
    brandTarget: '_self',
    colorPrimary: kiwi.link,
    colorSecondary: kiwi.link,
    appBg: palette.background.default,
    appContentBg: palette.background.paper,
    appPreviewBg: palette.background.default,
    appBorderColor: kiwi.border,
    appBorderRadius: radius,
    textColor: palette.text.primary,
    textMutedColor: palette.text.secondary,
    barBg: palette.background.paper,
    barTextColor: palette.text.secondary,
    barHoverColor: kiwi.link,
    barSelectedColor: kiwi.link,
    inputBg: palette.background.paper,
    inputBorder: kiwi.borderInteractive,
    inputTextColor: palette.text.primary,
    inputBorderRadius: radius,
  }),
});
