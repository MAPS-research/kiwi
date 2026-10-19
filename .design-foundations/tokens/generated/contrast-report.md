# Kiwi UI token checks — 2026-10-19 · source v2.0.0 (sha256 094207ed8c73) · at 05a85e0

Source: `.design-foundations/tokens/kiwi-ui.tokens.json` · Locked block: `kiwi-ui/DESIGN.md` · Result: **PASS**

## 1. Alias equality against the locked block

126 locked declarations compared (both modes), 0 mismatches. The 20 palette.mjs aliases + the 3 lock-named aliases:

| Mode | Locked name | DTCG token | Locked value | DTCG value | |
|---|---|---|---|---|---|
| light | --code-green | global.color.code-green | #446a2c | #446a2c | PASS |
| light | --background | semantic.color.background | #f6f5ed | #f6f5ed | PASS |
| light | --surface | semantic.color.surface | #fdfcf6 | #fdfcf6 | PASS |
| light | --surface-hover | semantic.color.surface-hover | #f0f2e5 | #f0f2e5 | PASS |
| light | --surface-active | semantic.color.surface-active | #e8eddf | #e8eddf | PASS |
| light | --border-subtle | semantic.color.border-subtle | #e1e6d8 | #e1e6d8 | PASS |
| light | --border | semantic.color.border | #d9ded0 | #d9ded0 | PASS |
| light | --border-strong | semantic.color.border-strong | #a9b29d | #a9b29d | PASS |
| light | --text-secondary | semantic.color.text-secondary | #566652 | #566652 | PASS |
| light | --text | semantic.color.text | #23442d | #23442d | PASS |
| light | --accent-bg-subtle | semantic.color.accent-bg-subtle | #eaf0df | #eaf0df | PASS |
| light | --selection-bg | semantic.color.selection.bg | #e4ebd9 | #e4ebd9 | PASS |
| light | --accent-bg-subtle-active | semantic.color.accent-bg-subtle-active | #dce5cc | #dce5cc | PASS |
| light | --accent-solid | semantic.color.accent-solid | #d0ddbd | #d0ddbd | PASS |
| light | --accent-solid-hover | semantic.color.accent-solid-hover | #c7d6b1 | #c7d6b1 | PASS |
| light | --accent-solid-active | semantic.color.accent-solid-active | #bfcea6 | #bfcea6 | PASS |
| light | --accent-solid-border | semantic.color.accent-solid-border | #577d37 | #577d37 | PASS |
| light | --accent-on-solid | semantic.color.accent-on-solid | #23482e | #23482e | PASS |
| light | --accent-text | semantic.color.accent-text | #23482e | #23482e | PASS |
| light | --selection-marker | semantic.color.selection.marker | #577d37 | #577d37 | PASS |
| light | --border-interactive | semantic.color.border-interactive | #7b8872 | #7b8872 | PASS |
| light | --focus-ring | semantic.color.focus-ring | #577d37 | #577d37 | PASS |
| light | --shadow-ink | semantic.color.shadow-ink | #23482e | #23482e | PASS |
| dark | --code-green | global.color.code-green | #b9cf9b | #b9cf9b | PASS |
| dark | --background | semantic.color.background | #121b14 | #121b14 | PASS |
| dark | --surface | semantic.color.surface | #1a251c | #1a251c | PASS |
| dark | --surface-hover | semantic.color.surface-hover | #222d23 | #222d23 | PASS |
| dark | --surface-active | semantic.color.surface-active | #2a3529 | #2a3529 | PASS |
| dark | --border-subtle | semantic.color.border-subtle | #30382e | #30382e | PASS |
| dark | --border | semantic.color.border | #3d4539 | #3d4539 | PASS |
| dark | --border-strong | semantic.color.border-strong | #5e6755 | #5e6755 | PASS |
| dark | --text-secondary | semantic.color.text-secondary | #bdc9ad | #bdc9ad | PASS |
| dark | --text | semantic.color.text | #e4e8db | #e4e8db | PASS |
| dark | --accent-bg-subtle | semantic.color.accent-bg-subtle | #27321f | #27321f | PASS |
| dark | --selection-bg | semantic.color.selection.bg | #2f3b22 | #2f3b22 | PASS |
| dark | --accent-bg-subtle-active | semantic.color.accent-bg-subtle-active | #374525 | #374525 | PASS |
| dark | --accent-solid | semantic.color.accent-solid | #354225 | #354225 | PASS |
| dark | --accent-solid-hover | semantic.color.accent-solid-hover | #3f4d2d | #3f4d2d | PASS |
| dark | --accent-solid-active | semantic.color.accent-solid-active | #495934 | #495934 | PASS |
| dark | --accent-solid-border | semantic.color.accent-solid-border | #859b69 | #859b69 | PASS |
| dark | --accent-on-solid | semantic.color.accent-on-solid | #e4e8db | #e4e8db | PASS |
| dark | --accent-text | semantic.color.accent-text | #b9cf9b | #b9cf9b | PASS |
| dark | --selection-marker | semantic.color.selection.marker | #b1c698 | #b1c698 | PASS |
| dark | --border-interactive | semantic.color.border-interactive | #79856e | #79856e | PASS |
| dark | --focus-ring | semantic.color.focus-ring | #b1c698 | #b1c698 | PASS |
| dark | --shadow-ink | semantic.color.shadow-ink | #06100a | #06100a | PASS |

## 2. Structure

20 listed components present: yes; 25 state groups, each with exactly the eight states (200 state specifications); geometry-only groups with no states (one look, the small-popup contract applied): toggletip.

## 3. Per-state contrast (both modes, from the alias values)

Targets: text ≥ 4.5:1, non-text (boundaries, icons, markers, rings) ≥ 3:1. 446 required assertions: 446 pass, 0 fail. 38 informational rows (inactive controls, WCAG 1.4.3/1.4.11 exemption, or decorative hairlines by lock) are reported, not required.

| Component | State | Pair | Kind | Min | Light | Dark | Result |
|---|---|---|---|---|---|---|---|
| button.primary | default | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| button.primary | default | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| button.primary | default | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| button.primary | default | fill on {surface} | non-text | 3 | 1.38 (#d0ddbd / #fdfcf6) | 1.48 (#354225 / #1a251c) | info: below · the Soft sage fill is a tint, not the boundary: the 1 px --accent-solid-border edge is |
| button.primary | hover | text on fill | text | 4.5 | 6.71 (#23482e / #c7d6b1) | 7.30 (#e4e8db / #3f4d2d) | PASS |
| button.primary | hover | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| button.primary | hover | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| button.primary | focus | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| button.primary | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| button.primary | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| button.primary | focus | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| button.primary | focus | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| button.primary | active | text on fill | text | 4.5 | 6.18 (#23482e / #bfcea6) | 6.11 (#e4e8db / #495934) | PASS |
| button.primary | active | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| button.primary | active | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| button.primary | disabled | text on fill | text | 4.5 | 4.72 (#566652 / #dce5cc) | 3.05 (#79856e / #2f3b22) | info: below · the faded label on its fill, lower than the enabled 7.24 / 8.62 (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | disabled | border on {surface} | non-text | 3 | 2.40 (#92ae70 / #fdfcf6) | 2.08 (#495934 / #1a251c) | info: below · the faint edge on the sheet: an edge, not a 3:1 boundary (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | disabled | border on {background} | non-text | 3 | 2.26 (#92ae70 / #f6f5ed) | 2.32 (#495934 / #121b14) | info: below · the faint edge on the canvas (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | disabled | fill on {surface} | non-text | 3 | 1.27 (#dce5cc / #fdfcf6) | 1.34 (#2f3b22 / #1a251c) | info: below · the faint sage fill against the disabled secondary's sheet fill: told apart (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | disabled | fill on {accent-bg-subtle} | non-text | 3 | 1.12 (#dce5cc / #eaf0df) | 1.13 (#2f3b22 / #27321f) | info: below · the faint sage fill against a hovered tertiary's tint: told apart, with the edge and the fainter label (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | loading | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| button.primary | loading | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| button.primary | loading | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| button.primary | error | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| button.primary | error | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| button.primary | error | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| button.primary | success | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| button.primary | success | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| button.primary | success | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| button.primary | success | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| button.secondary | default | text on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.secondary | default | border on {surface} | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| button.secondary | default | border on {background} | non-text | 3 | 3.42 (#7b8872 / #f6f5ed) | 4.52 (#79856e / #121b14) | PASS |
| button.secondary | hover | text on fill | text | 4.5 | 8.85 (#23482e / #eaf0df) | 7.98 (#b9cf9b / #27321f) | PASS |
| button.secondary | hover | border on fill | non-text | 3 | 3.22 (#7b8872 / #eaf0df) | 3.45 (#79856e / #27321f) | PASS |
| button.secondary | focus | text on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.secondary | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| button.secondary | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| button.secondary | active | text on fill | text | 4.5 | 7.91 (#23482e / #dce5cc) | 6.11 (#b9cf9b / #374525) | PASS |
| button.secondary | active | border on {surface} | non-text | 3 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| button.secondary | active | border on {background} | non-text | 3 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| button.secondary | active | fill on {accent-solid} | non-text | 3 | 1.09 (#dce5cc / #d0ddbd) | 1.04 (#374525 / #354225) | info: below · against the resting primary's fill: a tint one step away; the ink edge tells them apart |
| button.secondary | active | border on {accent-solid-border} | non-text | 3 | 2.27 (#23442d / #577d37) | 2.45 (#e4e8db / #859b69) | info: below · against the resting primary's edge: the ink against the strong green (light) or the sage edge (dark) |
| button.secondary | disabled | text on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 4.07 (#79856e / #1a251c) | info: below · the faded label on the sheet, lower than the enabled 10.03 / 9.40 (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.secondary | disabled | border on {surface} | non-text | 3 | 2.14 (#a9b29d / #fdfcf6) | 2.68 (#5e6755 / #1a251c) | info: below · the faint edge on the sheet: an edge, not a 3:1 boundary (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.secondary | disabled | border on {background} | non-text | 3 | 2.01 (#a9b29d / #f6f5ed) | 2.97 (#5e6755 / #121b14) | info: below · the faint edge on the canvas (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.secondary | disabled | fill on {accent-bg-subtle} | non-text | 3 | 1.13 (#fdfcf6 / #eaf0df) | 1.18 (#1a251c / #27321f) | info: below · the sheet fill against a hovered tertiary's tint: told apart, with the edge and the fainter label (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.secondary | loading | text on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.secondary | error | text on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.secondary | success | text on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.secondary | success | icon on fill | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.tertiary | default | text on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.tertiary | default | text on {background} | text | 4.5 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| button.tertiary | hover | text on fill | text | 4.5 | 8.85 (#23482e / #eaf0df) | 7.98 (#b9cf9b / #27321f) | PASS |
| button.tertiary | focus | text on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.tertiary | focus | text on {background} | text | 4.5 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| button.tertiary | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| button.tertiary | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| button.tertiary | active | text on fill | text | 4.5 | 7.91 (#23482e / #dce5cc) | 6.11 (#b9cf9b / #374525) | PASS |
| button.tertiary | disabled | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 4.07 (#79856e / #1a251c) | info: below · the faded label on the sheet (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.tertiary | disabled | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 4.52 (#79856e / #121b14) | info: clears · the faded label on the canvas (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.tertiary | loading | text on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.tertiary | loading | text on {background} | text | 4.5 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| button.tertiary | error | text on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.tertiary | error | text on {background} | text | 4.5 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| button.tertiary | success | text on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| button.tertiary | success | text on {background} | text | 4.5 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| button.tertiary.variant.pressed | variant:pressed | text on fill | text | 4.5 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on fill | non-text | 3 | 3.91 (#577d37 / #e4ebd9) | 6.44 (#b1c698 / #2f3b22) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| button.destructive | default | text on fill | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| button.destructive | default | border on {surface} | non-text | 3 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| button.destructive | default | border on {background} | non-text | 3 | 5.78 (#974843 / #f6f5ed) | 8.42 (#f49c95 / #121b14) | PASS |
| button.destructive | hover | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | hover | border on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | focus | text on fill | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| button.destructive | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| button.destructive | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| button.destructive | active | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | disabled | text on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 4.07 (#79856e / #1a251c) | info: below · the faded label on the sheet, lower than the enabled label (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.destructive | disabled | border on {surface} | non-text | 3 | 2.14 (#a9b29d / #fdfcf6) | 2.68 (#5e6755 / #1a251c) | info: below · the faint edge on the sheet: an edge, not a 3:1 boundary (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.destructive | disabled | border on {background} | non-text | 3 | 2.01 (#a9b29d / #f6f5ed) | 2.97 (#5e6755 / #121b14) | info: below · the faint edge on the canvas (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.destructive | disabled | fill on {accent-bg-subtle} | non-text | 3 | 1.13 (#fdfcf6 / #eaf0df) | 1.18 (#1a251c / #27321f) | info: below · the sheet fill against a hovered tertiary's tint: told apart, with the edge and the fainter label (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.destructive | loading | text on fill | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| button.destructive | error | text on fill | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| button.destructive | success | text on fill | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| icon-button.variant.selected | variant:selected | icon on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| icon-button.variant.selected | variant:selected | marker on fill | non-text | 3 | 3.91 (#577d37 / #e4ebd9) | 6.44 (#b1c698 / #2f3b22) | PASS |
| icon-button.variant.selected | variant:selected | marker on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| icon-button.variant.selected | variant:selected | marker on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| icon-button | default | icon on {surface} | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| icon-button | default | icon on {background} | non-text | 3 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| icon-button | hover | icon on fill | non-text | 3 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| icon-button | focus | icon on {surface} | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| icon-button | focus | icon on {background} | non-text | 3 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| icon-button | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| icon-button | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| icon-button | active | icon on fill | non-text | 3 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| icon-button | disabled | icon on {surface} | non-text | 3 | 2.14 (#a9b29d / #fdfcf6) | 2.68 (#5e6755 / #1a251c) | info: below · inactive control; the glyph drops to --border-strong so it reads as disabled; the reason is in the toggletip and helper |
| icon-button | disabled | icon on {background} | non-text | 3 | 2.01 (#a9b29d / #f6f5ed) | 2.97 (#5e6755 / #121b14) | info: below · inactive control; the glyph drops to --border-strong so it reads as disabled; the reason is in the toggletip and helper |
| icon-button | loading | icon on {surface} | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| icon-button | loading | icon on {background} | non-text | 3 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| icon-button | error | icon on {surface} | non-text | 3 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| icon-button | error | icon on {background} | non-text | 3 | 5.78 (#974843 / #f6f5ed) | 8.42 (#f49c95 / #121b14) | PASS |
| icon-button | success | icon on {surface} | non-text | 3 | 5.53 (#337437 / #fdfcf6) | 8.27 (#88cb8a / #1a251c) | PASS |
| icon-button | success | icon on {background} | non-text | 3 | 5.20 (#337437 / #f6f5ed) | 9.19 (#88cb8a / #121b14) | PASS |
| chip.status.variant.error | variant:error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status.variant.error | variant:error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status.variant.success | variant:success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.status.variant.success | variant:success | icon on fill | non-text | 3 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.status.variant.warning | variant:warning | text on fill | text | 4.5 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| chip.status.variant.warning | variant:warning | icon on fill | non-text | 3 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| chip.status.variant.info | variant:info | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status.variant.info | variant:info | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status.variant.neutral | variant:neutral | text on fill | text | 4.5 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | PASS |
| chip.status.variant.neutral | variant:neutral | icon on fill | non-text | 3 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | PASS |
| chip.status | default | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | hover | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | focus | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | active | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | disabled | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | loading | text on fill | text | 4.5 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | PASS |
| chip.status | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status | success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.filter.variant.selected | variant:selected | text on fill | text | 4.5 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| chip.filter.variant.selected | variant:selected | border on {surface} | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| chip.filter.variant.selected | variant:selected | border on {background} | non-text | 3 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| chip.filter | default | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| chip.filter | default | border on {surface} | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| chip.filter | default | border on {background} | non-text | 3 | 3.42 (#7b8872 / #f6f5ed) | 4.52 (#79856e / #121b14) | PASS |
| chip.filter | hover | text on fill | text | 4.5 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| chip.filter | hover | border on fill | non-text | 3 | 3.31 (#7b8872 / #f0f2e5) | 3.67 (#79856e / #222d23) | PASS |
| chip.filter | focus | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| chip.filter | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| chip.filter | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| chip.filter | active | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| chip.filter | active | border on fill | non-text | 3 | 3.14 (#7b8872 / #e8eddf) | 3.29 (#79856e / #2a3529) | PASS |
| chip.filter | disabled | text on fill | text | 4.5 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| chip.filter | loading | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| chip.filter | error | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| chip.filter | success | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| chip.role | default | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| chip.role | hover | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| chip.role | focus | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| chip.role | active | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| chip.role | disabled | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| chip.role | error | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| chip.role | success | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| switch.variant.on | variant:on | thumb on track | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| switch.variant.on | variant:on | border on {surface} | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| switch.variant.on | variant:on | border on {background} | non-text | 3 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| switch | default | thumb on track | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| switch | default | border on {surface} | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| switch | default | border on {background} | non-text | 3 | 3.42 (#7b8872 / #f6f5ed) | 4.52 (#79856e / #121b14) | PASS |
| switch | hover | thumb on track | non-text | 3 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| switch | focus | thumb on track | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| switch | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| switch | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| switch | active | thumb on track | non-text | 3 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| switch | disabled | thumb on track | non-text | 3 | 1.85 (#a9b29d / #e8eddf) | 2.16 (#5e6755 / #2a3529) | info: below · inactive control |
| switch | loading | thumb on track | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| switch | loading | border on {surface} | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| switch | loading | border on {background} | non-text | 3 | 3.42 (#7b8872 / #f6f5ed) | 4.52 (#79856e / #121b14) | PASS |
| switch | error | helper on {surface} | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| switch | error | helper on {background} | text | 4.5 | 5.78 (#974843 / #f6f5ed) | 8.42 (#f49c95 / #121b14) | PASS |
| switch | success | helper on {surface} | text | 4.5 | 5.53 (#337437 / #fdfcf6) | 8.27 (#88cb8a / #1a251c) | PASS |
| switch | success | helper on {background} | text | 4.5 | 5.20 (#337437 / #f6f5ed) | 9.19 (#88cb8a / #121b14) | PASS |
| field.variant.read-only | variant:read-only | text on fill | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| field | default | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | default | placeholder on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| field | default | border on {surface} | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| field | default | border on {background} | non-text | 3 | 3.42 (#7b8872 / #f6f5ed) | 4.52 (#79856e / #121b14) | PASS |
| field | default | label on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | default | label on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| field | default | helper on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| field | default | helper on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| field | hover | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | hover | border on fill | non-text | 3 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | focus | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| field | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| field | active | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | disabled | text on fill | text | 4.5 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| field | loading | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | loading | adornment on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| field | error | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | error | border on {surface} | non-text | 3 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| field | error | border on {background} | non-text | 3 | 5.78 (#974843 / #f6f5ed) | 8.42 (#f49c95 / #121b14) | PASS |
| field | error | helper on {surface} | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| field | error | helper on {background} | text | 4.5 | 5.78 (#974843 / #f6f5ed) | 8.42 (#f49c95 / #121b14) | PASS |
| field | success | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| field | success | helper on {surface} | text | 4.5 | 5.53 (#337437 / #fdfcf6) | 8.27 (#88cb8a / #1a251c) | PASS |
| field | success | helper on {background} | text | 4.5 | 5.20 (#337437 / #f6f5ed) | 9.19 (#88cb8a / #121b14) | PASS |
| checkbox.variant.checked | variant:checked | glyph on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| checkbox.variant.checked | variant:checked | border on {surface} | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| checkbox.variant.checked | variant:checked | border on {background} | non-text | 3 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| checkbox.variant.indeterminate | variant:indeterminate | glyph on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| checkbox.variant.indeterminate | variant:indeterminate | border on {surface} | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| checkbox.variant.radio-checked | variant:radio-checked | glyph on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| checkbox.variant.radio-checked | variant:radio-checked | border on {surface} | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| checkbox | default | border on {surface} | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| checkbox | default | border on {background} | non-text | 3 | 3.42 (#7b8872 / #f6f5ed) | 4.52 (#79856e / #121b14) | PASS |
| checkbox | default | label on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| checkbox | default | label on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| checkbox | hover | border on {surface} | non-text | 3 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| checkbox | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| checkbox | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| checkbox | active | border on fill | non-text | 3 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| checkbox | disabled | border on fill | non-text | 3 | 1.15 (#d9ded0 / #e8eddf) | 1.29 (#3d4539 / #2a3529) | info: below · inactive control; the reason states why |
| checkbox | disabled | label on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| checkbox | loading | border on {surface} | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| checkbox | loading | icon on {surface} | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| checkbox | error | border on {surface} | non-text | 3 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| checkbox | error | helper on {surface} | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| checkbox | error | icon on {surface} | non-text | 3 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| checkbox | success | glyph on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| checkbox | success | helper on {surface} | text | 4.5 | 5.53 (#337437 / #fdfcf6) | 8.27 (#88cb8a / #1a251c) | PASS |
| tabs.variant.selected | variant:selected | text on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| tabs.variant.selected | variant:selected | text on {background} | text | 4.5 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| tabs.variant.selected | variant:selected | marker on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| tabs.variant.selected | variant:selected | marker on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| tabs | default | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| tabs | default | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| tabs | hover | text on fill | text | 4.5 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| tabs | focus | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| tabs | focus | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| tabs | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| tabs | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| tabs | active | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| tabs | disabled | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| tabs | disabled | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| tabs | disabled | icon on {surface} | non-text | 3 | 2.14 (#a9b29d / #fdfcf6) | 2.68 (#5e6755 / #1a251c) | info: below · inactive control; the reason states why |
| tabs | loading | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| tabs | loading | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| tabs | error | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| tabs | error | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| tabs | error | icon on {surface} | non-text | 3 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| tabs | error | icon on {background} | non-text | 3 | 5.78 (#974843 / #f6f5ed) | 8.42 (#f49c95 / #121b14) | PASS |
| tabs | success | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| tabs | success | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| sidebar-item.variant.current | variant:current | text on fill | text | 4.5 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| sidebar-item.variant.current | variant:current | icon on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| sidebar-item.variant.current | variant:current | marker on fill | non-text | 3 | 3.91 (#577d37 / #e4ebd9) | 6.44 (#b1c698 / #2f3b22) | PASS |
| sidebar-item | default | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| sidebar-item | default | icon on {surface} | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| sidebar-item | hover | text on fill | text | 4.5 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| sidebar-item | hover | icon on fill | non-text | 3 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| sidebar-item | focus | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| sidebar-item | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| sidebar-item | active | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| sidebar-item | disabled | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | info: clears · inactive; in practice hidden by permission |
| sidebar-item | error | text on {surface} | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| sidebar-item | success | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| panel | default | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| panel | default | border on {background} | non-text | 3 | 1.25 (#d9ded0 / #f6f5ed) | 1.77 (#3d4539 / #121b14) | info: below · a panel edge is a hairline; not a control boundary |
| panel | hover | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| panel | focus | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| panel | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| panel | active | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| panel | disabled | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| panel | loading | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| panel | error | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| panel | success | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | default | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | default | title on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | hover | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | focus | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | focus | ring on fill | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| dialog | active | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | disabled | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | loading | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | error | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| dialog | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| dialog | success | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| alert.variant.error | variant:error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert.variant.error | variant:error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert.variant.error | variant:error | action on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert.variant.success | variant:success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| alert.variant.success | variant:success | icon on fill | non-text | 3 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| alert.variant.success | variant:success | action on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| alert.variant.warning | variant:warning | text on fill | text | 4.5 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| alert.variant.warning | variant:warning | icon on fill | non-text | 3 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| alert.variant.warning | variant:warning | action on fill | text | 4.5 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| alert.variant.info | variant:info | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert.variant.info | variant:info | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert.variant.info | variant:info | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert.variant.neutral | variant:neutral | text on fill | text | 4.5 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | PASS |
| alert.variant.neutral | variant:neutral | icon on fill | non-text | 3 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | PASS |
| alert | default | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | default | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | default | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | hover | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | hover | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | focus | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | focus | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | focus | ring on fill | non-text | 3 | 4.22 (#577d37 / #e3f3ff) | 8.59 (#b1c698 / #17242d) | PASS |
| alert | active | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | active | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | disabled | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | loading | text on fill | text | 4.5 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | PASS |
| alert | loading | bar on track | non-text | 3 | 3.14 (#7b8872 / #e8eddf) | 3.29 (#79856e / #2a3529) | PASS |
| alert | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert | error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert | success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| alert | success | icon on fill | non-text | 3 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| toast | default | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| toast | default | action on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| toast | hover | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| toast | hover | action on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| toast | focus | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| toast | focus | action on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| toast | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| toast | active | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| toast | active | action on fill | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| toast | disabled | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| toast | loading | text on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| toast | error | text on fill | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| toast | error | icon on fill | non-text | 3 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| toast | success | text on fill | text | 4.5 | 5.53 (#337437 / #fdfcf6) | 8.27 (#88cb8a / #1a251c) | PASS |
| toast | success | icon on fill | non-text | 3 | 5.53 (#337437 / #fdfcf6) | 8.27 (#88cb8a / #1a251c) | PASS |
| table.variant.selected | variant:selected | text on fill | text | 4.5 | 8.88 (#23442d / #e4ebd9) | 9.53 (#e4e8db / #2f3b22) | PASS |
| table.variant.selected | variant:selected | marker on fill | non-text | 3 | 3.91 (#577d37 / #e4ebd9) | 6.44 (#b1c698 / #2f3b22) | PASS |
| table.variant.header | variant:header | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| table.variant.header | variant:header | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| table | default | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| table | default | text on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| table | default | link on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| table | default | link on {background} | text | 4.5 | 9.42 (#23482e / #f6f5ed) | 10.45 (#b9cf9b / #121b14) | PASS |
| table | hover | text on fill | text | 4.5 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| table | hover | secondary on fill | text | 4.5 | 5.42 (#566652 / #f0f2e5) | 8.26 (#bdc9ad / #222d23) | PASS |
| table | focus | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| table | focus | text on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| table | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| table | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| table | active | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| table | disabled | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | info: clears · inactive row; toggletip states why |
| table | disabled | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | info: clears · inactive row; toggletip states why |
| table | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| table | success | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| table | success | text on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| data-grid | default | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| data-grid | default | text on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| data-grid | default | header on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| data-grid | default | header on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| data-grid | hover | text on fill | text | 4.5 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| data-grid | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| data-grid | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| data-grid | active | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| data-grid | disabled | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | info: clears · inactive row |
| data-grid | disabled | text on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | info: clears · inactive row |
| data-grid | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| data-grid | success | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| data-grid | success | text on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| kpi-tile | default | value on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| kpi-tile | default | label on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| kpi-tile | default | icon on fill | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| kpi-tile | default | trend on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| kpi-tile | hover | value on fill | text | 4.5 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| kpi-tile | hover | label on fill | text | 4.5 | 5.42 (#566652 / #f0f2e5) | 8.26 (#bdc9ad / #222d23) | PASS |
| kpi-tile | focus | value on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| kpi-tile | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| kpi-tile | active | value on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| kpi-tile | disabled | value on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| kpi-tile | loading | label on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| kpi-tile | error | label on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| kpi-tile | error | value on fill | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| kpi-tile | error | icon on fill | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| kpi-tile | error | error-glyph on fill | non-text | 3 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| kpi-tile | success | value on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| empty-state.variant.no-action | variant:no-action | title on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| empty-state.variant.no-action | variant:no-action | title on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| empty-state.variant.no-action | variant:no-action | copy on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| empty-state.variant.no-action | variant:no-action | copy on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| empty-state | default | title on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| empty-state | default | title on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| empty-state | default | copy on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| empty-state | default | copy on {background} | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| empty-state | default | ruler on {surface} | non-text | 3 | 2.14 (#a9b29d / #fdfcf6) | 2.68 (#5e6755 / #1a251c) | info: below · the ruler is a decorative rule by lock |
| empty-state | default | ruler on {background} | non-text | 3 | 2.01 (#a9b29d / #f6f5ed) | 2.97 (#5e6755 / #121b14) | info: below · the ruler is a decorative rule by lock |
| empty-state | hover | title on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| empty-state | hover | title on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| empty-state | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| empty-state | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| empty-state | active | title on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| empty-state | active | title on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| empty-state | disabled | title on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| empty-state | disabled | title on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| empty-state | error | title on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| empty-state | error | title on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| empty-state | error | copy on {surface} | text | 4.5 | 6.15 (#974843 / #fdfcf6) | 7.57 (#f49c95 / #1a251c) | PASS |
| empty-state | error | copy on {background} | text | 4.5 | 5.78 (#974843 / #f6f5ed) | 8.42 (#f49c95 / #121b14) | PASS |
| empty-state | success | title on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| empty-state | success | title on {background} | text | 4.5 | 9.92 (#23442d / #f6f5ed) | 14.14 (#e4e8db / #121b14) | PASS |
| display-menu | default | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| display-menu | default | group-label on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| display-menu | default | check on fill | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| display-menu | hover | text on fill | text | 4.5 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| display-menu | focus | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| display-menu | focus | ring on fill | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| display-menu | active | text on fill | text | 4.5 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| display-menu | disabled | text on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | info: clears · inactive |
| display-menu | loading | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| display-menu | error | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| display-menu | error | caption on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| display-menu | success | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| display-menu | success | check on fill | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| launcher.variant.badge | variant:badge | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| launcher | default | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| launcher | default | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| launcher | default | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| launcher | default | fill on {surface} | non-text | 3 | 1.38 (#d0ddbd / #fdfcf6) | 1.48 (#354225 / #1a251c) | info: below · the Soft sage fill is a tint, not the boundary: the 1 px --accent-solid-border edge is |
| launcher | hover | icon on fill | non-text | 3 | 6.71 (#23482e / #c7d6b1) | 7.30 (#e4e8db / #3f4d2d) | PASS |
| launcher | hover | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| launcher | hover | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| launcher | focus | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| launcher | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| launcher | focus | ring on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 9.56 (#b1c698 / #121b14) | PASS |
| launcher | focus | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| launcher | focus | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| launcher | active | icon on fill | non-text | 3 | 6.18 (#23482e / #bfcea6) | 6.11 (#e4e8db / #495934) | PASS |
| launcher | active | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| launcher | active | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| launcher | loading | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| launcher | loading | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| launcher | loading | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| launcher | error | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| launcher | error | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| launcher | error | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| launcher | success | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.62 (#e4e8db / #354225) | PASS |
| launcher | success | border on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 5.20 (#859b69 / #1a251c) | PASS |
| launcher | success | border on {background} | non-text | 3 | 4.37 (#577d37 / #f6f5ed) | 5.78 (#859b69 / #121b14) | PASS |
| tutor-message | default | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| tutor-message | default | link on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| tutor-message | default | code on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| tutor-message | default | citation on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| tutor-message | default | toolbar on {surface} | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| tutor-message | hover | toolbar on toolbar-fill | non-text | 3 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| tutor-message | focus | ring on {surface} | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| tutor-message | active | toolbar on toolbar-fill | non-text | 3 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| tutor-message | disabled | toolbar on {surface} | non-text | 3 | 2.14 (#a9b29d / #fdfcf6) | 2.68 (#5e6755 / #1a251c) | info: below · inactive control; toggletip "Not available yet" |
| tutor-message | loading | text on {surface} | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| tutor-message | loading | stop on {surface} | text | 4.5 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| tutor-message | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| tutor-message | error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| tutor-message | success | text on {surface} | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| tutor-message | success | thumb-chosen on {surface} | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| tutor-message.variant.thumb-chosen | variant:thumb-chosen | glyph on {surface} | non-text | 3 | 10.03 (#23482e / #fdfcf6) | 9.40 (#b9cf9b / #1a251c) | PASS |
| pdf-toolbar.variant.page-current | variant:page-current | outline on canvas | non-text | 3 | 3.42 (#7b8872 / #f6f5ed) | 4.52 (#79856e / #121b14) | PASS |
| pdf-toolbar.variant.pin-visible | variant:pin-visible | fill on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.pin-visible | variant:pin-visible | glyph on fill | non-text | 3 | 13.43 (#ffffff / #203327) | 13.43 (#ffffff / #203327) | PASS |
| pdf-toolbar.variant.pin-hidden | variant:pin-hidden | ring on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.pin-hidden | variant:pin-hidden | glyph on fill | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.chunk | variant:chunk | box on page | non-text | 3 | 6.14 (#566652 / #ffffff) | 6.14 (#566652 / #ffffff) | PASS |
| pdf-toolbar.variant.chunk | variant:chunk | selected on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.thumbnails | variant:thumbnails | outline on canvas | non-text | 3 | 3.42 (#7b8872 / #f6f5ed) | 4.52 (#79856e / #121b14) | PASS |
| pdf-toolbar.variant.thumbnails | variant:thumbnails | label on canvas | text | 4.5 | 5.62 (#566652 / #f6f5ed) | 10.16 (#bdc9ad / #121b14) | PASS |
| pdf-toolbar.variant.rail | variant:rail | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| pdf-toolbar.variant.rail | variant:rail | heading on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| pdf-toolbar.variant.search-panel | variant:search-panel | text on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| pdf-toolbar.variant.search-panel | variant:search-panel | status on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| pdf-toolbar.variant.banner | variant:banner | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar.variant.banner | variant:banner | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar.variant.banner | variant:banner | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar | default | title on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| pdf-toolbar | default | label on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| pdf-toolbar | default | icon on fill | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| pdf-toolbar | default | field-text on field-fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| pdf-toolbar | default | field-border on fill | non-text | 3 | 3.64 (#7b8872 / #fdfcf6) | 4.07 (#79856e / #1a251c) | PASS |
| pdf-toolbar | default | frame on canvas | non-text | 3 | 1.25 (#d9ded0 / #f6f5ed) | 1.77 (#3d4539 / #121b14) | info: below · the paper's frame is a hairline by lock |
| pdf-toolbar | hover | icon on button-fill | non-text | 3 | 9.57 (#23442d / #f0f2e5) | 11.49 (#e4e8db / #222d23) | PASS |
| pdf-toolbar | hover | title on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| pdf-toolbar | focus | ring on fill | non-text | 3 | 4.65 (#577d37 / #fdfcf6) | 8.60 (#b1c698 / #1a251c) | PASS |
| pdf-toolbar | focus | icon on fill | non-text | 3 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| pdf-toolbar | active | icon on button-fill | non-text | 3 | 9.10 (#23442d / #e8eddf) | 10.28 (#e4e8db / #2a3529) | PASS |
| pdf-toolbar | disabled | icon on fill | non-text | 3 | 2.14 (#a9b29d / #fdfcf6) | 2.68 (#5e6755 / #1a251c) | info: below · inactive control; the toggletip and helper state why |
| pdf-toolbar | disabled | title on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| pdf-toolbar | loading | label on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| pdf-toolbar | loading | title on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| pdf-toolbar | error | alert-text on alert-fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| pdf-toolbar | error | alert-icon on alert-fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| pdf-toolbar | error | title on fill | text | 4.5 | 10.55 (#23442d / #fdfcf6) | 12.72 (#e4e8db / #1a251c) | PASS |
| pdf-toolbar | success | label on fill | text | 4.5 | 5.98 (#566652 / #fdfcf6) | 9.15 (#bdc9ad / #1a251c) | PASS |
| pdf-toolbar | success | chip-text on chip | text | 4.5 | 5.15 (#566652 / #e8eddf) | 7.39 (#bdc9ad / #2a3529) | PASS |

## 4. Per-mode closure of the emitted CSS

:root declares 1326 properties. Dark: 848 depend on a mode token (transitively), 848 are redeclared in [data-theme="dark"], 0 missing. Compact: 96 depend on a density token, 96 redeclared in [data-density="compact"], 0 missing. Root-only composites that embed a mode colour (shadows, backdrop): 0.

## 10. Coarse pointer

34 properties depend on a pointer-varying token; the @media (pointer: coarse) block redeclares 34 on :root and 34 / 34 in the density blocks; 0 missing; --size-target-min consumed: yes.

## 8. Tier rule

937 component-tier references, 0 outside the semantic tier (the rule: component tokens reference semantic tokens only, never a global, never another component).

## 12. Component-tier literals

6 marked component-specific literals (allowed, each with its reason), 0 unmarked (every other component value is a semantic reference; the transparent fill is the role `semantic.color.fill-none`).

- `component.button.min-width` = "64px" — component-specific: the minimum width of a labelled button; no other component has one
- `component.field.select-padding-right` = "40px" — component-specific: the select's chevron clearance (TD-13)
- `component.dialog.max-height` = "80vh" — component-specific: a dialog's viewport cap
- `component.table.toolbar-collapse` = "1120px" — component-specific: the roster toolbar's container-query breakpoint (TD-34)
- `component.launcher.offset-y` = "96px" — component-specific: the launcher's resting offset (locked; position is Stage 2)
- `component.pdf-toolbar.field-width` = "56px" — component-specific: the page field's width

## 11. Density-invariant components

launcher and display-menu: 0 density-dependent tokens (their geometry is fixed; the menu item grows only on coarse pointers).

## 5. Literal policy

Colour literals outside the global tier: 0 (allowed: the G2 logo black/white, the mode-frozen on-paper marks, a mode-frozen companion.* literal that names its light source (Phase 4: the dark backing), and a chart.* literal that carries its derivation and that § 16 re-renders (Phase 6: the five series and the neutral); the backdrop and the shadows reference --shadow-ink and carry alphas, composed by the emitter). Banned purple-era hex in the generated CSS, public CSS and MUI preview: 0.

## 6. Public CSS coverage

143 v1 names pinned in the source, 0 unmapped, 0 not emitted; the public file on disk has 143 names, 0 of them not pinned. Mapping: 52 kept, 41 deprecated, 50 repointed, 26 added (169 total).

## 13. Public classes and keyframes

89 v1 class selectors and 3 keyframes pinned; 0 classes and 0 keyframes missing from the generated CSS (98 classes and 4 keyframes emitted); 18 deprecated with a replacement and the 4.0.0 schedule, 0 violations.

## 9. Deprecation schedule

Policy: A deprecated name keeps a safe value and is removed no earlier than two MAJOR versions after the release that deprecated it, and no earlier than six months after that release, whichever is later; the checker asserts the removal major. 41 deprecated names and 18 deprecated classes / keyframes, every one removed in a MAJOR ≥ 4.0.0 (0 violations).

## 14. Selection and pressed cues (a toggle is never colour alone)

12 toggle-like variants must carry a non-colour cue (a 2 px marker, a filled or check glyph, the thumb's position, or weight 600 against 400); marker, glyph and position cues must clear 3:1 against the selected fill and the unselected surfaces in both modes. 20 cue assertions, 0 failures.

| Variant | Cue | Pair | Light | Dark | Result |
|---|---|---|---|---|---|
| icon-button.variant.selected | marker | marker on fill | 3.91 | 6.44 | PASS |
| icon-button.variant.selected | marker | marker on {surface} | 4.65 | 8.60 | PASS |
| icon-button.variant.selected | marker | marker on {background} | 4.37 | 9.56 | PASS |
| button.tertiary.variant.pressed | marker | marker on fill | 3.91 | 6.44 | PASS |
| button.tertiary.variant.pressed | marker | marker on {surface} | 4.65 | 8.60 | PASS |
| button.tertiary.variant.pressed | marker | marker on {background} | 4.37 | 9.56 | PASS |
| tutor-message.variant.thumb-chosen | glyph | glyph on {surface} | 10.03 | 9.40 | PASS |
| chip.filter.variant.selected | weight | 600 vs 400 | — | — | PASS |
| tabs.variant.selected | marker | marker on {surface} | 4.65 | 8.60 | PASS |
| tabs.variant.selected | marker | marker on {background} | 4.37 | 9.56 | PASS |
| sidebar-item.variant.current | marker | marker on fill | 3.91 | 6.44 | PASS |
| sidebar-item.variant.current | marker | marker on {surface} | 4.65 | 8.60 | PASS |
| table.variant.selected | marker | marker on fill | 3.91 | 6.44 | PASS |
| table.variant.selected | marker | marker on {surface} | 4.65 | 8.60 | PASS |
| table.variant.selected | marker | marker on {background} | 4.37 | 9.56 | PASS |
| switch.variant.on | position | thumb on track | 8.43 | 7.04 | PASS |
| checkbox.variant.checked | glyph | glyph on fill | 8.43 | 7.04 | PASS |
| checkbox.variant.indeterminate | glyph | glyph on fill | 8.43 | 7.04 | PASS |
| checkbox.variant.radio-checked | glyph | glyph on fill | 8.43 | 7.04 | PASS |
| display-menu.state.default | glyph | check on fill | 10.03 | 9.40 | PASS |

## 15. Frozen literals

4 literals name their source in $extensions["org.kiwi"].frozen; 0 drifted.

| Token | Literal | Source | Resolved | Result |
|---|---|---|---|---|
| semantic.color.on-paper.pin | #203327 | {global.color.accent.12} (light) | #203327 | PASS |
| semantic.color.on-paper.chunk | #566652 | {global.color.neutral.11} (light) | #566652 | PASS |
| semantic.color.on-paper.wash | #2033271f | {semantic.color.on-paper.pin} (light, α 0.12) | #2033271f | PASS |
| companion.backing (mode.dark) | #fdfcf6 | {global.color.paper.2} (light) | #fdfcf6 | PASS |

## 16. Chart series (Phase 6)

10 series values (five per mode) and the neutral, 0 failures. Gates: ≥ 3:1 on --surface, --background and --surface-hover; OKLCH L within ± 0.07 of one target per mode; chroma 0.1–0.14; hue inside 45°–255°; minimum pairwise OKLab distance (× 100) ≥ 8 under protanopia and deuteranopia (Machado 2009, severity 1.0) and ≥ 15 under normal vision, all pairs; every hex equal to its recorded parameters re-rendered.

- light: target L 0.56, spread 0.13; min contrast 3.03:1; min distance under protanopia 8.14 (series 1 vs 3), adjacent 14.78; min distance under normal vision 15.26 (series 1 vs 2); Other #77746d at 4.12:1, 4.66 from the nearest series under simulation (informational).
- dark: target L 0.634, spread 0.135; min contrast 3.04:1; min distance under deuteranopia 8.16 (series 1 vs 3), adjacent 16.45; min distance under normal vision 15.37 (series 1 vs 4); Other #8d8b83 at 4.19:1, 5.57 from the nearest series under simulation (informational).

| Mode | Token | Hex | Hue | L | C | on --surface | on --background | on --surface-hover | |
|---|---|---|---|---|---|---|---|---|---|
| light | --chart-1 | #2b774d | 155.8° | 0.511 | 0.101 | 5.31 | 4.99 | 4.82 | PASS |
| light | --chart-2 | #0098af | 213.3° | 0.625 | 0.109 | 3.34 | 3.14 | 3.03 | PASS |
| light | --chart-3 | #a64e00 | 51.1° | 0.526 | 0.137 | 5.51 | 5.17 | 5.00 | PASS |
| light | --chart-4 | #0064ad | 249.8° | 0.495 | 0.140 | 5.96 | 5.60 | 5.41 | PASS |
| light | --chart-5 | #958b00 | 104.5° | 0.626 | 0.132 | 3.42 | 3.22 | 3.10 | PASS |
| light | --chart-other | #77746d | 87.5° | 0.559 | 0.011 | 4.54 | 4.26 | 4.12 | PASS |
| dark | --chart-1 | #3f895e | 155.8° | 0.571 | 0.100 | 3.74 | 4.15 | 3.37 | PASS |
| dark | --chart-2 | #00b2cc | 212.9° | 0.701 | 0.123 | 6.22 | 6.91 | 5.61 | PASS |
| dark | --chart-3 | #b65a15 | 50.8° | 0.570 | 0.140 | 3.37 | 3.74 | 3.04 | PASS |
| dark | --chart-4 | #3e7ab4 | 249.7° | 0.566 | 0.110 | 3.51 | 3.90 | 3.17 | PASS |
| dark | --chart-5 | #a99d15 | 103.8° | 0.685 | 0.140 | 5.67 | 6.31 | 5.12 | PASS |
| dark | --chart-other | #8d8b83 | 95.2° | 0.636 | 0.012 | 4.64 | 5.16 | 4.19 | PASS |

| Mode | Pair | Protanopia | Deuteranopia | Normal | |
|---|---|---|---|---|---|
| light | 1 vs 2 | 16.05 | 14.78 | 15.26 | PASS |
| light | 1 vs 3 | 8.14 | 8.14 | 18.99 | PASS |
| light | 1 vs 4 | 17.31 | 17.86 | 17.84 | PASS |
| light | 1 vs 5 | 11.13 | 15.22 | 15.57 | PASS |
| light | 2 vs 3 | 24.14 | 19.58 | 26.26 | PASS |
| light | 2 vs 4 | 15.73 | 15.70 | 15.37 | PASS |
| light | 2 vs 5 | 17.96 | 19.39 | 19.72 | PASS |
| light | 3 vs 4 | 22.33 | 25.57 | 27.45 | PASS |
| light | 3 vs 5 | 15.25 | 9.63 | 15.68 | PASS |
| light | 4 vs 5 | 26.31 | 30.44 | 29.06 | PASS |
| dark | 1 vs 2 | 18.05 | 16.45 | 16.98 | PASS |
| dark | 1 vs 3 | 10.07 | 8.16 | 19.23 | PASS |
| dark | 1 vs 4 | 14.67 | 14.47 | 15.37 | PASS |
| dark | 1 vs 5 | 11.83 | 15.70 | 15.95 | PASS |
| dark | 2 vs 3 | 28.07 | 22.05 | 29.12 | PASS |
| dark | 2 vs 4 | 15.91 | 14.24 | 15.45 | PASS |
| dark | 2 vs 5 | 20.28 | 20.85 | 21.48 | PASS |
| dark | 3 vs 4 | 21.37 | 22.43 | 24.68 | PASS |
| dark | 3 vs 5 | 16.88 | 11.27 | 17.01 | PASS |
| dark | 4 vs 5 | 24.77 | 27.75 | 26.70 | PASS |

| Chrome role | References | Light | Dark | |
|---|---|---|---|---|
| --chart-grid | {semantic.color.border-subtle} | #e1e6d8 | #30382e | PASS |
| --chart-baseline | {semantic.color.border-strong} | #a9b29d | #5e6755 | PASS |
| --chart-tick-text | {semantic.color.text-secondary} | #566652 | #bdc9ad | PASS |
| --chart-plot | {semantic.color.surface} | #fdfcf6 | #1a251c | PASS |

## 17. Editor selection

23 assertions, 0 failures: the selection is a visible tint on --editor-bg, differs from the active line, carries a 1 px --editor-selection-outline that clears 3:1 against the surface and the active line, and keeps every syntax colour at 4.5:1.

| Assertion | Light | Dark | Result |
|---|---|---|---|
| selection tint on --editor-bg ≥ 1.1:1 (a visible tint, not 1:1) | 1.27 | 1.54 | PASS |
| selection differs from the active line | #dce5cc vs #e8eddf | #374525 vs #2a3529 | PASS |
| selection outline on --editor-bg ≥ 3:1 | 4.65 | 8.60 | PASS |
| selection outline on the active line ≥ 3:1 | 4.01 | 6.95 | PASS |
| selection on the active line (tint alone, informational: the outline carries it) | 1.09 | 1.24 | PASS |
| syntax.keyword on the selection ≥ 4.5:1 | 8.33 | 8.27 | PASS |
| syntax.builtin on the selection ≥ 4.5:1 | 8.33 | 8.27 | PASS |
| syntax.type on the selection ≥ 4.5:1 | 8.33 | 8.27 | PASS |
| syntax.class on the selection ≥ 4.5:1 | 8.33 | 8.27 | PASS |
| syntax.function on the selection ≥ 4.5:1 | 8.33 | 8.27 | PASS |
| syntax.variable on the selection ≥ 4.5:1 | 8.33 | 8.27 | PASS |
| syntax.operator on the selection ≥ 4.5:1 | 4.72 | 5.94 | PASS |
| syntax.punctuation on the selection ≥ 4.5:1 | 4.72 | 5.94 | PASS |
| syntax.comment on the selection ≥ 4.5:1 | 4.72 | 5.94 | PASS |
| syntax.string on the selection ≥ 4.5:1 | 4.82 | 6.11 | PASS |
| syntax.number on the selection ≥ 4.5:1 | 4.58 | 5.20 | PASS |
| syntax.constant on the selection ≥ 4.5:1 | 4.58 | 5.20 | PASS |
| syntax.decorator on the selection ≥ 4.5:1 | 4.72 | 5.94 | PASS |
| syntax.error on the selection ≥ 4.5:1 | 4.85 | 4.92 | PASS |
| syntax.warning on the selection ≥ 4.5:1 | 4.63 | 5.12 | PASS |
| the Ace selection rule carries the tint and the outline | {"background":"semantic.editor.selection","ring":"semantic.editor.selection-outline"} | — | PASS |
| ace-kiwi-light.css: the selection rule has the resolved tint and a 1 px outline | .ace-kiwi-light .ace_marker-layer .ace_selection { background-color: #dce5cc; outline: 1px solid #577d37; outline-offset | — | PASS |
| ace-kiwi-dark.css: the selection rule has the resolved tint and a 1 px outline | .ace-kiwi-dark .ace_marker-layer .ace_selection { background-color: #374525; outline: 1px solid #b1c698; outline-offset: | — | PASS |

## 18. Public reduced-motion guard

4 selectors of the public CSS run an animation or a transition; 4 of them are stilled inside the scoped @media (prefers-reduced-motion: reduce) block (0 missing); the block carries no universal selector and no !important.

## 19. MUI grey and common

32 palette keys checked (grey 50–900 and A100–A700 against the neutral ramp, common black/white against the G2 logo roles, both schemes), 0 mismatches.

## 7. Density deltas (comfortable → compact), identical in both colour modes

| Token | Comfortable | Compact |
|---|---|---|
| semantic.space.inset-x | 16px | 12px |
| semantic.space.inset-y | 12px | 8px |
| semantic.space.inline | 12px | 8px |
| semantic.space.stack | 24px | 16px |
| semantic.space.section | 48px | 32px |
| semantic.space.gutter | 32px | 24px |
| semantic.space.cell-x | 16px | 12px |
| semantic.space.cell-y | 12px | 8px |
| semantic.space.panel | 24px | 16px |
| semantic.space.control-pad-y | 11px | 7px |
| semantic.space.field-pad-y | 9px | 7px |
| semantic.size.control | 44px | 36px |
| semantic.size.control-icon | 44px | 36px |
| semantic.size.row | 52px | 36px |
| semantic.size.tab | 44px | 36px |
| semantic.size.nav-item | 44px | 36px |
| semantic.size.chip | 32px | 28px |
| semantic.size.icon | 24px | 20px |
| semantic.size.col-min-text | 160px | 144px |
| semantic.size.col-min-date | 148px | 136px |
| semantic.size.col-min-num | 96px | 88px |
| semantic.size.col-min-status | 160px | 144px |
| semantic.size.col-min-check | 56px | 48px |
| semantic.size.hit-icon | 44px | 36px |
| semantic.size.hit-chip | 32px | 28px |
| semantic.size.hit-control | 44px | 36px |
| semantic.size.hit-tab | 44px | 36px |
| semantic.type.body | 1rem / 24px | 0.875rem / 20px |
| semantic.type.body-cjk | 1rem / 28px | 0.875rem / 24px |
| semantic.type.control | 1rem / 24px | 0.875rem / 20px |

## 20. Companion backing (Phase 4)

7 required token pairs (the forest outline ≥ 3:1 on the dark backing and on the light surfaces behind the transparent light backing), 0 below; 21 shipped assets pixel-sampled (the lightest forest-class pixel of each on the dark backing and on light --surface-active), 0 below 3.

| Mode | Pair | Value | Ratio | |
|---|---|---|---|---|
| dark | outline on companion.backing | #fdfcf6 | 10.26 | PASS |
| light | outline on --surface (light backing transparent) | #fdfcf6 | 10.26 | PASS |
| light | outline on --background (light backing transparent) | #f6f5ed | 9.64 | PASS |
| light | outline on --surface-hover (light backing transparent) | #f0f2e5 | 9.31 | PASS |
| light | outline on --surface-active (light backing transparent) | #e8eddf | 8.84 | PASS |
| light | outline on --accent-bg-subtle (light backing transparent) | #eaf0df | 9.05 | PASS |
| light | outline on --status-error-surface (light backing transparent) | #ffebe9 | 9.19 | PASS |
| dark | backing disc on --background | #121b14 | 17.13 | informational |
| dark | backing disc on --surface | #1a251c | 15.42 | informational |
| dark | tan bill on companion.backing (not the outline) | #fdfcf6 | 1.81 | informational |

| Asset (pixel-sampled) | Forest px | Lightest forest | on dark backing | on light surface-active | tan lightest on backing (info) | |
|---|---:|---|---|---|---|---|
| atlas/full-walk.64.webp | 16,562 | #5f7767 | 4.73 | 4.08 | 1.04 | PASS |
| atlas/full-hop-flight.64.webp | 15,926 | #627b65 | 4.50 | 3.88 | 1.03 | PASS |
| atlas/full-wave-bow.64.webp | 15,655 | #627768 | 4.69 | 4.04 | 1.57 | PASS |
| atlas/stamp-peek.96.webp | 31,093 | #5f7565 | 4.84 | 4.17 | 1.03 | PASS |
| stills/stand.64.webp | 653 | #5a6748 | 5.89 | 5.08 | 1.70 | PASS |
| stills/stand.128.webp | 2,614 | #5d725f | 5.06 | 4.36 | 1.06 | PASS |
| stills/idle.128.webp | 5,804 | #627866 | 4.65 | 4.00 | 1.06 | PASS |
| stills/idle.192.webp | 13,065 | #627260 | 4.99 | 4.30 | 1.06 | PASS |
| stills/error.128.webp | 4,145 | #61735e | 4.96 | 4.27 | 1.03 | PASS |
| stills/error.192.webp | 9,333 | #627762 | 4.71 | 4.06 | 1.04 | PASS |
| stills/walk.128.webp | 2,781 | #54634a | 6.27 | 5.40 | 1.09 | PASS |
| stills/walk.192.webp | 6,262 | #5a715c | 5.17 | 4.46 | 1.14 | PASS |
| stills/wave.64.webp | 713 | #485d4b | 6.94 | 5.98 | 1.57 | PASS |
| stills/wave.128.webp | 2,863 | #516955 | 5.83 | 5.03 | 1.57 | PASS |
| stills/wave.192.webp | 6,432 | #5c6f5f | 5.25 | 4.52 | 1.67 | PASS |
| stills/peek.64.webp | 812 | #5d6d5d | 5.36 | 4.62 | 1.05 | PASS |
| stills/peek.128.webp | 3,322 | #5f7060 | 5.14 | 4.43 | 1.03 | PASS |
| stills/peek.192.webp | 7,448 | #627061 | 5.10 | 4.39 | 1.03 | PASS |
| stills/retract.64.webp | 224 | #5d6d5e | 5.36 | 4.62 | 1.05 | PASS |
| stills/retract.128.webp | 910 | #5f6d60 | 5.32 | 4.58 | 1.09 | PASS |
| stills/retract.192.webp | 2,048 | #606d59 | 5.34 | 4.60 | 1.03 | PASS |

## 21. Global provenance (2026-10-18 re-lock)

83 global colour values (per mode): 17 taken as given from the reference, 40 OKLCH derivations re-rendered from their recorded parameters, 26 kept from the 2026-10-16 lock; 0 failures. The neutral, accent and paper ramps are monotonic in OKLCH lightness in both modes.

| Ramp | Mode | OKLCH L, step 1 → last | |
|---|---|---|---|
| neutral | light | 0.987 → 0.973 → 0.956 → 0.938 → 0.927 → 0.917 → 0.893 → 0.751 → 0.681 → 0.610 → 0.491 → 0.354 | PASS |
| neutral | dark | 0.187 → 0.220 → 0.256 → 0.283 → 0.315 → 0.330 → 0.379 → 0.501 → 0.551 → 0.600 → 0.819 → 0.924 | PASS |
| accent | light | 0.985 → 0.967 → 0.946 → 0.930 → 0.908 → 0.879 → 0.855 → 0.829 → 0.714 → 0.545 → 0.366 → 0.301 | PASS |
| accent | dark | 0.199 → 0.251 → 0.301 → 0.334 → 0.359 → 0.369 → 0.399 → 0.440 → 0.659 → 0.799 → 0.825 → 0.920 | PASS |
| paper | light | 0.996 → 0.990 → 0.969 → 0.947 | PASS |
| paper | dark | 0.185 → 0.211 → 0.251 → 0.285 | PASS |

| Mode | Global | Value | Source | |
|---|---|---|---|---|
| light | --neutral-1 | #fbfbf7 | derived oklch(0.988 0.006 110): the lightest neutral, above the hover step | PASS |
| dark | --neutral-1 | #0e1510 | derived oklch(0.185 0.014 152): the darkest neutral, below the canvas | PASS |
| light | --neutral-2 | #f6f7ee | derived oklch(0.972 0.011 112): one step below neutral-1 | PASS |
| dark | --neutral-2 | #151d16 | derived oklch(0.22 0.018 150): one step up | PASS |
| light | --neutral-3 | #f0f2e5 | given: kiwi-icon .km-frame-strip button (the hover row) | PASS |
| dark | --neutral-3 | #1c261d | derived oklch(0.255 0.021 149): one step up, beside the sheet | PASS |
| light | --neutral-4 | #e8eddf | given: kiwi-icon .km-motion-controls (the pressed row) | PASS |
| dark | --neutral-4 | #222d23 | derived oklch(0.285 0.024 147): tonal hover, one step above the sheet | PASS |
| light | --neutral-5 | #e5e9dc | derived oklch(0.928 0.019 122.8): between the pressed row and the rule | PASS |
| dark | --neutral-5 | #2a3529 | derived oklch(0.315 0.026 144): pressed rows, role chips | PASS |
| light | --neutral-6 | #e1e6d8 | given: kiwi-icon .km-stage-spec border-top (the rule) | PASS |
| dark | --neutral-6 | #30382e | derived oklch(0.33 0.022 140): row dividers | PASS |
| light | --neutral-7 | #d9ded0 | given: kiwi-icon --km-line (the hairline) | PASS |
| dark | --neutral-7 | #3d4539 | derived oklch(0.38 0.024 136): panel edges | PASS |
| light | --neutral-8 | #a9b29d | derived oklch(0.75 0.031 126): the ruler, in the reference's line hue, at the lock's 2.0:1 on the canvas | PASS |
| dark | --neutral-8 | #5e6755 | derived oklch(0.5 0.03 130): the ruler at the lock's dark 2.8:1 | PASS |
| light | --neutral-9 | #929d87 | derived oklch(0.68 0.034 129.3): between the ruler and the field edge | PASS |
| dark | --neutral-9 | #6b7662 | derived oklch(0.55 0.033 130): between the ruler and the field edge | PASS |
| light | --neutral-10 | #7b8872 | derived oklch(0.61 0.036 132.5): the field edge, in the line hue, at >= 3:1 (the reference's line is 1.25:1) | PASS |
| dark | --neutral-10 | #79856e | derived oklch(0.6 0.036 130): the field edge at >= 3:1 on the canvas, the sheet, the hover and pressed rows and the hover tint (L 0.56, the exploration's value, measured 2.78:1 on the pressed row in the component gate) | PASS |
| light | --neutral-11 | #566652 | derived oklch(0.49 0.037 139.4): --km-muted darkened by 0.036 L so it clears 4.5:1 on every tint (the reference's is 4.33:1 on its selected fill) | PASS |
| dark | --neutral-11 | #bdc9ad | given: kiwi-icon .km-loader-caption (secondary text on the forest band) | PASS |
| light | --neutral-12 | #23442d | given: kiwi-icon --km-ink (body text) | PASS |
| dark | --neutral-12 | #e4e8db | derived oklch(0.925 0.018 122): paper-tinted ink for long reading | PASS |
| light | --accent-1 | #f9fbf4 | derived oklch(0.985 0.01 120): the palest sage tint | PASS |
| dark | --accent-1 | #111810 | derived oklch(0.2 0.02 140): the darkest sage, below the hover tint | PASS |
| light | --accent-2 | #f2f6ea | derived oklch(0.966 0.016 121): one step deeper | PASS |
| dark | --accent-2 | #1c2517 | derived oklch(0.25 0.028 136): one step up | PASS |
| light | --accent-3 | #eaf0df | given: kiwi-icon button :hover (the hover tint) | PASS |
| dark | --accent-3 | #27321f | derived oklch(0.3 0.035 132): hover tint | PASS |
| light | --accent-4 | #e4ebd9 | given: kiwi-icon [aria-pressed=true] (the selected fill) | PASS |
| dark | --accent-4 | #2f3b22 | derived oklch(0.335 0.045 130): selected fill | PASS |
| light | --accent-5 | #dce5cc | given: kiwi-icon [data-background=sage] stage (the pressed tint) | PASS |
| dark | --accent-5 | #354225 | derived oklch(0.36 0.05 128): the primary's fill: a deep sage tint | PASS |
| light | --accent-6 | #d0ddbd | derived oklch(0.88 0.045 125): the primary's fill: one step deeper than the selected tint, so the primary is not read as a selected chip | PASS |
| dark | --accent-6 | #374525 | derived oklch(0.37 0.055 129): pressed tint and the editor selection | PASS |
| light | --accent-7 | #c7d6b1 | derived oklch(0.855 0.052 125): the primary's hover | PASS |
| dark | --accent-7 | #3f4d2d | derived oklch(0.4 0.055 128): the primary's hover | PASS |
| light | --accent-8 | #bfcea6 | derived oklch(0.83 0.057 125): the primary's pressed fill | PASS |
| dark | --accent-8 | #495934 | derived oklch(0.44 0.06 128): the primary's pressed fill | PASS |
| light | --accent-9 | #92ae70 | given: kiwi-icon --kiwi-sage (the mascot's sage) | PASS |
| dark | --accent-9 | #859b69 | derived oklch(0.66 0.075 128): the primary's sage edge | PASS |
| light | --accent-10 | #577d37 | given: kiwi-icon focus outline and the pressed icon card (the strong green) | PASS |
| dark | --accent-10 | #b1c698 | given: kiwi-icon .km-toggle accent (focus and the selection marker) | PASS |
| light | --accent-11 | #23482e | given: kiwi-icon --km-forest (accent text, labels) | PASS |
| dark | --accent-11 | #b9cf9b | given: kiwi-icon .km-loader-demo accent (accent text on the forest band) | PASS |
| light | --accent-12 | #203327 | kept: the 2026-10-16 lock (palette.mjs run A, accent-12): the deepest step, frozen into the on-paper pin | PASS |
| dark | --accent-12 | #deeacd | derived oklch(0.92 0.04 125): the palest sage, above accent text | PASS |
| light | --paper-1 | #fefefa | derived oklch(0.996 0.005 99): the lightest value, above the sheet | PASS |
| dark | --paper-1 | #0d150f | derived oklch(0.185 0.016 152): below the canvas | PASS |
| light | --paper-2 | #fdfcf6 | given: kiwi-icon --km-paper (the sheet) | PASS |
| dark | --paper-2 | #121b14 | derived oklch(0.21 0.018 152): a forest-black canvas, the night version of the reference's forest band, at the lock's dark lightness | PASS |
| light | --paper-3 | #f6f5ed | given: kiwi-icon --km-cream (the page) | PASS |
| dark | --paper-3 | #1a251c | derived oklch(0.25 0.022 150): the sheet, one tonal step up | PASS |
| light | --paper-4 | #f0eee2 | derived oklch(0.948 0.016 102): one step below the canvas | PASS |
| dark | --paper-4 | #212e23 | derived oklch(0.285 0.026 148): one step above the sheet | PASS |
| light | --code-green | #446a2c | derived oklch(0.48 0.1 135): a code-string green kept apart from the ink (accent text is now the ink's forest) | PASS |
| dark | --code-green | #b9cf9b | given: kiwi-icon .km-loader-demo accent (equal to dark accent-11) | PASS |
| light | --error-3 | #ffebe9 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --error-3 | #331a18 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --error-9 | #e1524f | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --error-9 | #e1524f | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --error-11 | #974843 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --error-11 | #f49c95 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --success-3 | #e0f8e0 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --success-3 | #152715 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --success-9 | #5ad664 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --success-9 | #5ad664 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --success-11 | #337437 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --success-11 | #88cb8a | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --warning-3 | #f9f0dd | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --warning-3 | #282113 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --warning-9 | #dbb155 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --warning-9 | #dbb155 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --warning-11 | #76602f | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --warning-11 | #cdb482 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --info-3 | #e3f3ff | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --info-3 | #17242d | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --info-9 | #5baee5 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --info-9 | #5baee5 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --info-11 | #3d6886 | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| dark | --info-11 | #90bedf | kept: palette.mjs run C, the 2026-10-16 lock | PASS |
| light | --green-black | #06100a | kept: palette.mjs run A, the 2026-10-16 lock | PASS |

## 22. The dialog against its scrim

The backdrop (--shadow-ink at its mode's alpha) composited over the canvas. 1 required assertion (dark: the dialog's edge ≥ 3:1 against the scrim), 0 failures.

| Mode | Scrim | Sheet against it | Edge against it | |
|---|---|---|---|---|
| light | #a2b0a1 | sheet #fdfcf6 2.21 | edge #d9ded0 1.65 | informational (the sheet's tonal step) |
| dark | #0b140e | sheet #1a251c 1.18 | edge #5e6755 3.17 | PASS (edge ≥ 3) |

## 23. Public states against the component spec

53 stateful public rules (buttons, the field, chips, the steps; the public CSS has no row class) held to the spec's part in both modes, and their emitted light literal: 53 pass, 0 fail. Linked by the same role 46, by a shared role 7, by value only 0. Planted defects: 2 of 2 caught (the secondary's hover on --kiwi-bg-selected (the re-lock's regression, in the CSS); --kiwi-bg-tint re-pointed at --selection-bg (the same, through the map)).

| Rule | Property | Public name → role | Spec part | Light (public / spec) | Dark (public / spec) | |
|---|---|---|---|---|---|---|
| .kiwi-btn-primary | background-color | `--kiwi-primary` → color.accent-solid | button.primary.state.default.fill | #d0ddbd / #d0ddbd | #354225 / #354225 | PASS |
| .kiwi-btn-primary | color | `--kiwi-primary-contrast` → color.accent-on-solid | button.primary.state.default.text | #23482e / #23482e | #e4e8db / #e4e8db | PASS |
| .kiwi-btn-primary | border-color | `--kiwi-primary-border` → color.accent-solid-border | button.primary.state.default.border | #577d37 / #577d37 | #859b69 / #859b69 | PASS |
| .kiwi-btn-primary:hover:not(:disabled):not([aria-disabl… | background-color | `--kiwi-primary-hover` → color.accent-solid-hover | button.primary.state.hover.fill | #c7d6b1 / #c7d6b1 | #3f4d2d / #3f4d2d | PASS |
| .kiwi-btn-primary:active:not(:disabled):not([aria-disab… | background-color | `--kiwi-primary-active` → color.accent-solid-active | button.primary.state.active.fill | #bfcea6 / #bfcea6 | #495934 / #495934 | PASS |
| .kiwi-btn:focus-visible | outline | `--kiwi-border-focus` → color.focus-ring | button.primary.state.focus.ring | #577d37 / #577d37 | #b1c698 / #b1c698 | PASS |
| .kiwi-btn:focus-visible | outline | `--kiwi-border-focus` → color.focus-ring | button.secondary.state.focus.ring | #577d37 / #577d37 | #b1c698 / #b1c698 | PASS |
| .kiwi-btn-primary[aria-disabled="true"], .kiwi-btn-prim… | background-color | `--kiwi-primary-disabled` → color.disabled.solid | button.primary.state.disabled.fill | #dce5cc / #dce5cc | #2f3b22 / #2f3b22 | PASS |
| .kiwi-btn-primary[aria-disabled="true"], .kiwi-btn-prim… | border-color | `--kiwi-primary-disabled-border` → color.disabled.solid-border | button.primary.state.disabled.border | #92ae70 / #92ae70 | #495934 / #495934 | PASS |
| .kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled | color | `--kiwi-disabled-label` → color.disabled.label | button.primary.state.disabled.text | #566652 / #566652 | #79856e / #79856e | PASS |
| .kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled | color | `--kiwi-disabled-label` → color.disabled.label | button.secondary.state.disabled.text | #566652 / #566652 | #79856e / #79856e | PASS |
| .kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled | background-color | `--kiwi-bg-paper` → color.surface | button.secondary.state.disabled.fill | #fdfcf6 / #fdfcf6 | #1a251c / #1a251c | PASS |
| .kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled | border-color | `--kiwi-disabled-outline` → color.disabled.outline | button.secondary.state.disabled.border | #a9b29d / #a9b29d | #5e6755 / #5e6755 | PASS |
| .kiwi-btn-secondary | background-color | `--kiwi-bg-paper` → color.surface | button.secondary.state.default.fill | #fdfcf6 / #fdfcf6 | #1a251c / #1a251c | PASS |
| .kiwi-btn-secondary | color | `--kiwi-link` → color.link | button.secondary.state.default.text | #23482e / #23482e | #b9cf9b / #b9cf9b | PASS (a shared role) |
| .kiwi-btn-secondary | border-color | `--kiwi-border-interactive` → color.border-interactive | button.secondary.state.default.border | #7b8872 / #7b8872 | #79856e / #79856e | PASS |
| .kiwi-btn-secondary:hover:not(:disabled):not([aria-disa… | background-color | `--kiwi-bg-tint` → color.accent-bg-subtle | button.secondary.state.hover.fill | #eaf0df / #eaf0df | #27321f / #27321f | PASS |
| .kiwi-btn-secondary:active:not(:disabled):not([aria-dis… | background-color | `--kiwi-bg-pressed` → color.accent-bg-subtle-active | button.secondary.state.active.fill | #dce5cc / #dce5cc | #374525 / #374525 | PASS |
| .kiwi-btn-secondary:active:not(:disabled):not([aria-dis… | border-color | `--kiwi-text-primary` → color.text | button.secondary.state.active.border | #23442d / #23442d | #e4e8db / #e4e8db | PASS |
| .kiwi-input | background-color | `--kiwi-bg-paper` → color.surface | field.state.default.fill | #fdfcf6 / #fdfcf6 | #1a251c / #1a251c | PASS |
| .kiwi-input | color | `--kiwi-text-primary` → color.text | field.state.default.text | #23442d / #23442d | #e4e8db / #e4e8db | PASS |
| .kiwi-input | border-color | `--kiwi-border-interactive` → color.border-interactive | field.state.default.border | #7b8872 / #7b8872 | #79856e / #79856e | PASS |
| .kiwi-input:hover | border-color | `--kiwi-text-primary` → color.text | field.state.hover.border | #23442d / #23442d | #e4e8db / #e4e8db | PASS |
| .kiwi-input:focus-visible | outline | `--kiwi-border-focus` → color.focus-ring | field.state.focus.ring | #577d37 / #577d37 | #b1c698 / #b1c698 | PASS |
| .kiwi-input[aria-invalid="true"] | border-color | `--kiwi-error-text` → color.status.error.text | field.state.error.border | #974843 / #974843 | #f49c95 / #f49c95 | PASS |
| .kiwi-input[aria-disabled="true"], .kiwi-input:disabled | background-color | `--kiwi-disabled-surface` → color.disabled.surface | field.state.disabled.fill | #e8eddf / #e8eddf | #2a3529 / #2a3529 | PASS |
| .kiwi-input[aria-disabled="true"], .kiwi-input:disabled | color | `--kiwi-disabled-text` → color.disabled.text | field.state.disabled.text | #566652 / #566652 | #bdc9ad / #bdc9ad | PASS |
| .kiwi-input[aria-disabled="true"], .kiwi-input:disabled | border-color | `--kiwi-disabled-border` → color.disabled.border | field.state.disabled.border | #d9ded0 / #d9ded0 | #3d4539 / #3d4539 | PASS |
| .kiwi-input[aria-busy="true"] | border-color | `--kiwi-border-interactive` → color.border-interactive | field.state.loading.border | #7b8872 / #7b8872 | #79856e / #79856e | PASS |
| .kiwi-input[data-state="success"] | border-color | `--kiwi-border-interactive` → color.border-interactive | field.state.success.border | #7b8872 / #7b8872 | #79856e / #79856e | PASS |
| .kiwi-chip | background-color | `--kiwi-bg-active` → color.surface-active | chip.role.state.default.fill | #e8eddf / #e8eddf | #2a3529 / #2a3529 | PASS |
| .kiwi-chip | color | `--kiwi-text-primary` → color.text | chip.role.state.default.text | #23442d / #23442d | #e4e8db / #e4e8db | PASS |
| .kiwi-chip-primary | background-color | `--kiwi-bg-selected` → color.selection.bg | chip.filter.variant.selected.fill | #e4ebd9 / #e4ebd9 | #2f3b22 / #2f3b22 | PASS |
| .kiwi-chip-primary | color | `--kiwi-link` → color.link | chip.filter.variant.selected.text | #23482e / #23482e | #b9cf9b / #b9cf9b | PASS (a shared role) |
| .kiwi-chip-primary | border-color | `--kiwi-link` → color.link | chip.filter.variant.selected.border | #23482e / #23482e | #b9cf9b / #b9cf9b | PASS (a shared role) |
| .kiwi-chip-status-success | background-color | `--kiwi-success-surface` → color.status.success.surface | chip.status.variant.success.fill | #e0f8e0 / #e0f8e0 | #152715 / #152715 | PASS |
| .kiwi-chip-status-success | color | `--kiwi-success-text` → color.status.success.text | chip.status.variant.success.text | #337437 / #337437 | #88cb8a / #88cb8a | PASS |
| .kiwi-chip-status-warning | background-color | `--kiwi-warning-surface` → color.status.warning.surface | chip.status.variant.warning.fill | #f9f0dd / #f9f0dd | #282113 / #282113 | PASS |
| .kiwi-chip-status-warning | color | `--kiwi-warning-text` → color.status.warning.text | chip.status.variant.warning.text | #76602f / #76602f | #cdb482 / #cdb482 | PASS |
| .kiwi-chip-status-error | background-color | `--kiwi-error-surface` → color.status.error.surface | chip.status.variant.error.fill | #ffebe9 / #ffebe9 | #331a18 / #331a18 | PASS |
| .kiwi-chip-status-error | color | `--kiwi-error-text` → color.status.error.text | chip.status.variant.error.text | #974843 / #974843 | #f49c95 / #f49c95 | PASS |
| .kiwi-chip-status-info | background-color | `--kiwi-info-surface` → color.status.info.surface | chip.status.variant.info.fill | #e3f3ff / #e3f3ff | #17242d / #17242d | PASS |
| .kiwi-chip-status-info | color | `--kiwi-info-text` → color.status.info.text | chip.status.variant.info.text | #3d6886 / #3d6886 | #90bedf / #90bedf | PASS |
| .kiwi-step-indicator[aria-current="step"] | background-color | `--kiwi-bg-selected` → color.selection.bg | color.selection.bg | #e4ebd9 / #e4ebd9 | #2f3b22 / #2f3b22 | PASS |
| .kiwi-step-indicator[aria-current="step"] | border-color | `--kiwi-link` → color.link | color.selection.text | #23482e / #23482e | #b9cf9b / #b9cf9b | PASS (a shared role) |
| .kiwi-step-indicator[aria-current="step"] | color | `--kiwi-link` → color.link | color.selection.text | #23482e / #23482e | #b9cf9b / #b9cf9b | PASS (a shared role) |
| .kiwi-step-active .kiwi-step-indicator | background-color | `--kiwi-bg-selected` → color.selection.bg | color.selection.bg | #e4ebd9 / #e4ebd9 | #2f3b22 / #2f3b22 | PASS |
| .kiwi-step-active .kiwi-step-indicator | border-color | `--kiwi-link` → color.link | color.selection.text | #23482e / #23482e | #b9cf9b / #b9cf9b | PASS (a shared role) |
| .kiwi-step-active .kiwi-step-indicator | color | `--kiwi-link` → color.link | color.selection.text | #23482e / #23482e | #b9cf9b / #b9cf9b | PASS (a shared role) |
| .kiwi-step-indicator[data-done] | background-color | `--kiwi-success-surface` → color.status.success.surface | color.status.success.surface | #e0f8e0 / #e0f8e0 | #152715 / #152715 | PASS |
| .kiwi-step-indicator[data-done] | color | `--kiwi-success-text` → color.status.success.text | color.status.success.text | #337437 / #337437 | #88cb8a / #88cb8a | PASS |
| .kiwi-step-indicator[aria-invalid="true"] | background-color | `--kiwi-error-surface` → color.status.error.surface | color.status.error.surface | #ffebe9 / #ffebe9 | #331a18 / #331a18 | PASS |
| .kiwi-step-indicator[aria-invalid="true"] | color | `--kiwi-error-text` → color.status.error.text | color.status.error.text | #974843 / #974843 | #f49c95 / #f49c95 | PASS |
