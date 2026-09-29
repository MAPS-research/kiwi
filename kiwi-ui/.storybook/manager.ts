import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming';
import kiwiTheme from '../src/Theme.ts';

const { palette } = kiwiTheme;

addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Kiwi Design System',
    brandUrl: './?path=/docs/storybook-guide-welcome--docs',
    brandTarget: '_self',
    colorPrimary: palette.primary.main,
    colorSecondary: palette.primary.main,
    appBg: palette.background.default,
    appContentBg: palette.background.paper,
    appPreviewBg: palette.background.default,
    appBorderColor: palette.divider,
    textColor: palette.text.primary,
    textMutedColor: palette.text.secondary,
    barTextColor: palette.text.secondary,
    barHoverColor: palette.primary.main,
    barSelectedColor: palette.primary.main,
    inputBg: palette.background.paper,
    inputBorder: palette.divider,
    inputTextColor: palette.text.primary,
  }),
});
