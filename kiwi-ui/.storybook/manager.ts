import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';

/* Values mirror the semantic tokens in src/index.css (the manager cannot load
   the preview's Tailwind CSS, so the tokens are inlined here). */
const tokens = {
  primary: '#6a1b9a',
  background: '#fafafa',
  card: '#ffffff',
  border: '#e0e0e0',
  foreground: '#212121',
  mutedForeground: '#616161',
};

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Kiwi Design System',
    brandUrl: './?path=/docs/getting-started-about--docs',
    brandTarget: '_self',
    colorPrimary: tokens.primary,
    colorSecondary: tokens.primary,
    appBg: tokens.background,
    appContentBg: tokens.card,
    appPreviewBg: tokens.background,
    appBorderColor: tokens.border,
    textColor: tokens.foreground,
    textMutedColor: tokens.mutedForeground,
    barTextColor: tokens.mutedForeground,
    barHoverColor: tokens.primary,
    barSelectedColor: tokens.primary,
    inputBg: tokens.card,
    inputBorder: tokens.border,
    inputTextColor: tokens.foreground,
  }),
});
