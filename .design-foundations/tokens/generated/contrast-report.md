# Kiwi UI token checks — 2026-10-19 · source v2.0.0 (sha256 051772c4039b) · at 588b654

Source: `.design-foundations/tokens/kiwi-ui.tokens.json` · Locked block: `kiwi-ui/DESIGN.md` · Result: **PASS**

## 1. Alias equality against the locked block

126 locked declarations compared (both modes), 0 mismatches. The 20 palette.mjs aliases + the 3 lock-named aliases:

| Mode | Locked name | DTCG token | Locked value | DTCG value | |
|---|---|---|---|---|---|
| light | --code-green | global.color.code-green | #446a2c | #446a2c | PASS |
| light | --background | semantic.color.background | #f6f4f3 | #f6f4f3 | PASS |
| light | --surface | semantic.color.surface | #fdfbfb | #fdfbfb | PASS |
| light | --surface-hover | semantic.color.surface-hover | #f2f0ee | #f2f0ee | PASS |
| light | --surface-active | semantic.color.surface-active | #eceae8 | #eceae8 | PASS |
| light | --border-subtle | semantic.color.border-subtle | #e5e3e1 | #e5e3e1 | PASS |
| light | --border | semantic.color.border | #dddbd9 | #dddbd9 | PASS |
| light | --border-strong | semantic.color.border-strong | #b1adaa | #b1adaa | PASS |
| light | --text-secondary | semantic.color.text-secondary | #6a5f49 | #6a5f49 | PASS |
| light | --text | semantic.color.text | #443c16 | #443c16 | PASS |
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
| light | --border-interactive | semantic.color.border-interactive | #85837e | #85837e | PASS |
| light | --focus-ring | semantic.color.focus-ring | #577d37 | #577d37 | PASS |
| light | --shadow-ink | semantic.color.shadow-ink | #23482e | #23482e | PASS |
| dark | --code-green | global.color.code-green | #b9cf9b | #b9cf9b | PASS |
| dark | --background | semantic.color.background | #191816 | #191816 | PASS |
| dark | --surface | semantic.color.surface | #22221f | #22221f | PASS |
| dark | --surface-hover | semantic.color.surface-hover | #2a2a27 | #2a2a27 | PASS |
| dark | --surface-active | semantic.color.surface-active | #33312f | #33312f | PASS |
| dark | --border-subtle | semantic.color.border-subtle | #363533 | #363533 | PASS |
| dark | --border | semantic.color.border | #43423f | #43423f | PASS |
| dark | --border-strong | semantic.color.border-strong | #656360 | #656360 | PASS |
| dark | --text-secondary | semantic.color.text-secondary | #d5c0a8 | #d5c0a8 | PASS |
| dark | --text | semantic.color.text | #efe4da | #efe4da | PASS |
| dark | --accent-bg-subtle | semantic.color.accent-bg-subtle | #27321f | #27321f | PASS |
| dark | --selection-bg | semantic.color.selection.bg | #2f3b22 | #2f3b22 | PASS |
| dark | --accent-bg-subtle-active | semantic.color.accent-bg-subtle-active | #374525 | #374525 | PASS |
| dark | --accent-solid | semantic.color.accent-solid | #354225 | #354225 | PASS |
| dark | --accent-solid-hover | semantic.color.accent-solid-hover | #3f4d2d | #3f4d2d | PASS |
| dark | --accent-solid-active | semantic.color.accent-solid-active | #495934 | #495934 | PASS |
| dark | --accent-solid-border | semantic.color.accent-solid-border | #859b69 | #859b69 | PASS |
| dark | --accent-on-solid | semantic.color.accent-on-solid | #efe4da | #efe4da | PASS |
| dark | --accent-text | semantic.color.accent-text | #b9cf9b | #b9cf9b | PASS |
| dark | --selection-marker | semantic.color.selection.marker | #b1c698 | #b1c698 | PASS |
| dark | --border-interactive | semantic.color.border-interactive | #83807b | #83807b | PASS |
| dark | --focus-ring | semantic.color.focus-ring | #b1c698 | #b1c698 | PASS |
| dark | --shadow-ink | semantic.color.shadow-ink | #06100a | #06100a | PASS |

## 2. Structure

20 listed components present: yes; 25 state groups, each with exactly the eight states (200 state specifications); geometry-only groups with no states (one look, the small-popup contract applied): toggletip.

## 3. Per-state contrast (both modes, from the alias values)

Targets: text ≥ 4.5:1, non-text (boundaries, icons, markers, rings) ≥ 3:1. 446 required assertions: 446 pass, 0 fail. 38 informational rows (inactive controls, WCAG 1.4.3/1.4.11 exemption, or decorative hairlines by lock) are reported, not required.

| Component | State | Pair | Kind | Min | Light | Dark | Result |
|---|---|---|---|---|---|---|---|
| button.primary | default | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| button.primary | default | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| button.primary | default | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| button.primary | default | fill on {surface} | non-text | 3 | 1.38 (#d0ddbd / #fdfbfb) | 1.49 (#354225 / #22221f) | info: below · the Soft sage fill is a tint, not the boundary: the 1 px --accent-solid-border edge is |
| button.primary | hover | text on fill | text | 4.5 | 6.71 (#23482e / #c7d6b1) | 7.26 (#efe4da / #3f4d2d) | PASS |
| button.primary | hover | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| button.primary | hover | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| button.primary | focus | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| button.primary | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| button.primary | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| button.primary | focus | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| button.primary | focus | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| button.primary | active | text on fill | text | 4.5 | 6.18 (#23482e / #bfcea6) | 6.08 (#efe4da / #495934) | PASS |
| button.primary | active | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| button.primary | active | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| button.primary | disabled | text on fill | text | 4.5 | 4.82 (#6a5f49 / #dce5cc) | 3.02 (#83807b / #2f3b22) | info: below · the faded label on its fill, lower than the enabled 7.24 / 8.62 (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | disabled | border on {surface} | non-text | 3 | 2.39 (#92ae70 / #fdfbfb) | 2.10 (#495934 / #22221f) | info: below · the faint edge on the sheet: an edge, not a 3:1 boundary (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | disabled | border on {background} | non-text | 3 | 2.25 (#92ae70 / #f6f4f3) | 2.33 (#495934 / #191816) | info: below · the faint edge on the canvas (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | disabled | fill on {surface} | non-text | 3 | 1.26 (#dce5cc / #fdfbfb) | 1.34 (#2f3b22 / #22221f) | info: below · the faint sage fill against the disabled secondary's sheet fill: told apart (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | disabled | fill on {accent-bg-subtle} | non-text | 3 | 1.12 (#dce5cc / #eaf0df) | 1.13 (#2f3b22 / #27321f) | info: below · the faint sage fill against a hovered tertiary's tint: told apart, with the edge and the fainter label (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.primary | loading | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| button.primary | loading | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| button.primary | loading | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| button.primary | error | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| button.primary | error | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| button.primary | error | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| button.primary | success | text on fill | text | 4.5 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| button.primary | success | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| button.primary | success | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| button.primary | success | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| button.secondary | default | text on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.secondary | default | border on {surface} | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| button.secondary | default | border on {background} | non-text | 3 | 3.45 (#85837e / #f6f4f3) | 4.51 (#83807b / #191816) | PASS |
| button.secondary | hover | text on fill | text | 4.5 | 8.85 (#23482e / #eaf0df) | 7.98 (#b9cf9b / #27321f) | PASS |
| button.secondary | hover | border on fill | non-text | 3 | 3.25 (#85837e / #eaf0df) | 3.42 (#83807b / #27321f) | PASS |
| button.secondary | focus | text on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.secondary | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| button.secondary | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| button.secondary | active | text on fill | text | 4.5 | 7.91 (#23482e / #dce5cc) | 6.11 (#b9cf9b / #374525) | PASS |
| button.secondary | active | border on {surface} | non-text | 3 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| button.secondary | active | border on {background} | non-text | 3 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| button.secondary | active | fill on {accent-solid} | non-text | 3 | 1.09 (#dce5cc / #d0ddbd) | 1.04 (#374525 / #354225) | info: below · against the resting primary's fill: a tint one step away; the ink edge tells them apart |
| button.secondary | active | border on {accent-solid-border} | non-text | 3 | 2.31 (#443c16 / #577d37) | 2.44 (#efe4da / #859b69) | info: below · against the resting primary's edge: the ink against the strong green (light) or the sage edge (dark) |
| button.secondary | disabled | text on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 4.05 (#83807b / #22221f) | info: below · the faded label on the sheet, lower than the enabled 9.99 / 9.46 (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.secondary | disabled | border on {surface} | non-text | 3 | 2.16 (#b1adaa / #fdfbfb) | 2.66 (#656360 / #22221f) | info: below · the faint edge on the sheet: an edge, not a 3:1 boundary (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.secondary | disabled | border on {background} | non-text | 3 | 2.03 (#b1adaa / #f6f4f3) | 2.96 (#656360 / #191816) | info: below · the faint edge on the canvas (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.secondary | disabled | fill on {accent-bg-subtle} | non-text | 3 | 1.13 (#fdfbfb / #eaf0df) | 1.19 (#22221f / #27321f) | info: below · the sheet fill against a hovered tertiary's tint: told apart, with the edge and the fainter label (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.secondary | loading | text on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.secondary | error | text on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.secondary | success | text on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.secondary | success | icon on fill | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.tertiary | default | text on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.tertiary | default | text on {background} | text | 4.5 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| button.tertiary | hover | text on fill | text | 4.5 | 8.85 (#23482e / #eaf0df) | 7.98 (#b9cf9b / #27321f) | PASS |
| button.tertiary | focus | text on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.tertiary | focus | text on {background} | text | 4.5 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| button.tertiary | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| button.tertiary | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| button.tertiary | active | text on fill | text | 4.5 | 7.91 (#23482e / #dce5cc) | 6.11 (#b9cf9b / #374525) | PASS |
| button.tertiary | disabled | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 4.05 (#83807b / #22221f) | info: below · the faded label on the sheet (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.tertiary | disabled | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 4.51 (#83807b / #191816) | info: clears · the faded label on the canvas (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.tertiary | loading | text on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.tertiary | loading | text on {background} | text | 4.5 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| button.tertiary | error | text on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.tertiary | error | text on {background} | text | 4.5 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| button.tertiary | success | text on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| button.tertiary | success | text on {background} | text | 4.5 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| button.tertiary.variant.pressed | variant:pressed | text on fill | text | 4.5 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on fill | non-text | 3 | 3.91 (#577d37 / #e4ebd9) | 6.44 (#b1c698 / #2f3b22) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| button.destructive | default | text on fill | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| button.destructive | default | border on {surface} | non-text | 3 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| button.destructive | default | border on {background} | non-text | 3 | 5.76 (#974843 / #f6f4f3) | 8.48 (#f49c95 / #191816) | PASS |
| button.destructive | hover | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | hover | border on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | focus | text on fill | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| button.destructive | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| button.destructive | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| button.destructive | active | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | disabled | text on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 4.05 (#83807b / #22221f) | info: below · the faded label on the sheet, lower than the enabled label (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.destructive | disabled | border on {surface} | non-text | 3 | 2.16 (#b1adaa / #fdfbfb) | 2.66 (#656360 / #22221f) | info: below · the faint edge on the sheet: an edge, not a 3:1 boundary (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.destructive | disabled | border on {background} | non-text | 3 | 2.03 (#b1adaa / #f6f4f3) | 2.96 (#656360 / #191816) | info: below · the faint edge on the canvas (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.destructive | disabled | fill on {accent-bg-subtle} | non-text | 3 | 1.13 (#fdfbfb / #eaf0df) | 1.19 (#22221f / #27321f) | info: below · the sheet fill against a hovered tertiary's tint: told apart, with the edge and the fainter label (the user's decision of 2026-10-18 ("淡化即可（推荐）"; plan Decision Log, "Disabled buttons"); WCAG exempts inactive controls) |
| button.destructive | loading | text on fill | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| button.destructive | error | text on fill | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| button.destructive | success | text on fill | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| icon-button.variant.selected | variant:selected | icon on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| icon-button.variant.selected | variant:selected | marker on fill | non-text | 3 | 3.91 (#577d37 / #e4ebd9) | 6.44 (#b1c698 / #2f3b22) | PASS |
| icon-button.variant.selected | variant:selected | marker on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| icon-button.variant.selected | variant:selected | marker on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| icon-button | default | icon on {surface} | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| icon-button | default | icon on {background} | non-text | 3 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| icon-button | hover | icon on fill | non-text | 3 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| icon-button | focus | icon on {surface} | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| icon-button | focus | icon on {background} | non-text | 3 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| icon-button | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| icon-button | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| icon-button | active | icon on fill | non-text | 3 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| icon-button | disabled | icon on {surface} | non-text | 3 | 2.16 (#b1adaa / #fdfbfb) | 2.66 (#656360 / #22221f) | info: below · inactive control; the glyph drops to --border-strong so it reads as disabled; the reason is in the toggletip and helper |
| icon-button | disabled | icon on {background} | non-text | 3 | 2.03 (#b1adaa / #f6f4f3) | 2.96 (#656360 / #191816) | info: below · inactive control; the glyph drops to --border-strong so it reads as disabled; the reason is in the toggletip and helper |
| icon-button | loading | icon on {surface} | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| icon-button | loading | icon on {background} | non-text | 3 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| icon-button | error | icon on {surface} | non-text | 3 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| icon-button | error | icon on {background} | non-text | 3 | 5.76 (#974843 / #f6f4f3) | 8.48 (#f49c95 / #191816) | PASS |
| icon-button | success | icon on {surface} | non-text | 3 | 5.51 (#337437 / #fdfbfb) | 8.32 (#88cb8a / #22221f) | PASS |
| icon-button | success | icon on {background} | non-text | 3 | 5.18 (#337437 / #f6f4f3) | 9.26 (#88cb8a / #191816) | PASS |
| chip.status.variant.error | variant:error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status.variant.error | variant:error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status.variant.success | variant:success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.status.variant.success | variant:success | icon on fill | non-text | 3 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.status.variant.warning | variant:warning | text on fill | text | 4.5 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| chip.status.variant.warning | variant:warning | icon on fill | non-text | 3 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| chip.status.variant.info | variant:info | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status.variant.info | variant:info | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status.variant.neutral | variant:neutral | text on fill | text | 4.5 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | PASS |
| chip.status.variant.neutral | variant:neutral | icon on fill | non-text | 3 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | PASS |
| chip.status | default | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | hover | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | focus | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | active | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | disabled | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | loading | text on fill | text | 4.5 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | PASS |
| chip.status | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status | success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.filter.variant.selected | variant:selected | text on fill | text | 4.5 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| chip.filter.variant.selected | variant:selected | border on {surface} | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| chip.filter.variant.selected | variant:selected | border on {background} | non-text | 3 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| chip.filter | default | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| chip.filter | default | border on {surface} | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| chip.filter | default | border on {background} | non-text | 3 | 3.45 (#85837e / #f6f4f3) | 4.51 (#83807b / #191816) | PASS |
| chip.filter | hover | text on fill | text | 4.5 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| chip.filter | hover | border on fill | non-text | 3 | 3.33 (#85837e / #f2f0ee) | 3.66 (#83807b / #2a2a27) | PASS |
| chip.filter | focus | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| chip.filter | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| chip.filter | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| chip.filter | active | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| chip.filter | active | border on fill | non-text | 3 | 3.16 (#85837e / #eceae8) | 3.29 (#83807b / #33312f) | PASS |
| chip.filter | disabled | text on fill | text | 4.5 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| chip.filter | loading | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| chip.filter | error | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| chip.filter | success | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| chip.role | default | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| chip.role | hover | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| chip.role | focus | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| chip.role | active | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| chip.role | disabled | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| chip.role | error | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| chip.role | success | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| switch.variant.on | variant:on | thumb on track | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| switch.variant.on | variant:on | border on {surface} | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| switch.variant.on | variant:on | border on {background} | non-text | 3 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| switch | default | thumb on track | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| switch | default | border on {surface} | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| switch | default | border on {background} | non-text | 3 | 3.45 (#85837e / #f6f4f3) | 4.51 (#83807b / #191816) | PASS |
| switch | hover | thumb on track | non-text | 3 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| switch | focus | thumb on track | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| switch | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| switch | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| switch | active | thumb on track | non-text | 3 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| switch | disabled | thumb on track | non-text | 3 | 1.86 (#b1adaa / #eceae8) | 2.16 (#656360 / #33312f) | info: below · inactive control |
| switch | loading | thumb on track | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| switch | loading | border on {surface} | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| switch | loading | border on {background} | non-text | 3 | 3.45 (#85837e / #f6f4f3) | 4.51 (#83807b / #191816) | PASS |
| switch | error | helper on {surface} | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| switch | error | helper on {background} | text | 4.5 | 5.76 (#974843 / #f6f4f3) | 8.48 (#f49c95 / #191816) | PASS |
| switch | success | helper on {surface} | text | 4.5 | 5.51 (#337437 / #fdfbfb) | 8.32 (#88cb8a / #22221f) | PASS |
| switch | success | helper on {background} | text | 4.5 | 5.18 (#337437 / #f6f4f3) | 9.26 (#88cb8a / #191816) | PASS |
| field.variant.read-only | variant:read-only | text on fill | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| field | default | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | default | placeholder on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| field | default | border on {surface} | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| field | default | border on {background} | non-text | 3 | 3.45 (#85837e / #f6f4f3) | 4.51 (#83807b / #191816) | PASS |
| field | default | label on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | default | label on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| field | default | helper on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| field | default | helper on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| field | hover | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | hover | border on fill | non-text | 3 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | focus | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| field | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| field | active | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | disabled | text on fill | text | 4.5 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| field | loading | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | loading | adornment on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| field | error | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | error | border on {surface} | non-text | 3 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| field | error | border on {background} | non-text | 3 | 5.76 (#974843 / #f6f4f3) | 8.48 (#f49c95 / #191816) | PASS |
| field | error | helper on {surface} | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| field | error | helper on {background} | text | 4.5 | 5.76 (#974843 / #f6f4f3) | 8.48 (#f49c95 / #191816) | PASS |
| field | success | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| field | success | helper on {surface} | text | 4.5 | 5.51 (#337437 / #fdfbfb) | 8.32 (#88cb8a / #22221f) | PASS |
| field | success | helper on {background} | text | 4.5 | 5.18 (#337437 / #f6f4f3) | 9.26 (#88cb8a / #191816) | PASS |
| checkbox.variant.checked | variant:checked | glyph on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| checkbox.variant.checked | variant:checked | border on {surface} | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| checkbox.variant.checked | variant:checked | border on {background} | non-text | 3 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| checkbox.variant.indeterminate | variant:indeterminate | glyph on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| checkbox.variant.indeterminate | variant:indeterminate | border on {surface} | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| checkbox.variant.radio-checked | variant:radio-checked | glyph on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| checkbox.variant.radio-checked | variant:radio-checked | border on {surface} | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| checkbox | default | border on {surface} | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| checkbox | default | border on {background} | non-text | 3 | 3.45 (#85837e / #f6f4f3) | 4.51 (#83807b / #191816) | PASS |
| checkbox | default | label on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| checkbox | default | label on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| checkbox | hover | border on {surface} | non-text | 3 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| checkbox | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| checkbox | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| checkbox | active | border on fill | non-text | 3 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| checkbox | disabled | border on fill | non-text | 3 | 1.15 (#dddbd9 / #eceae8) | 1.29 (#43423f / #33312f) | info: below · inactive control; the reason states why |
| checkbox | disabled | label on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| checkbox | loading | border on {surface} | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| checkbox | loading | icon on {surface} | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| checkbox | error | border on {surface} | non-text | 3 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| checkbox | error | helper on {surface} | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| checkbox | error | icon on {surface} | non-text | 3 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| checkbox | success | glyph on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| checkbox | success | helper on {surface} | text | 4.5 | 5.51 (#337437 / #fdfbfb) | 8.32 (#88cb8a / #22221f) | PASS |
| tabs.variant.selected | variant:selected | text on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| tabs.variant.selected | variant:selected | text on {background} | text | 4.5 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| tabs.variant.selected | variant:selected | marker on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| tabs.variant.selected | variant:selected | marker on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| tabs | default | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| tabs | default | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| tabs | hover | text on fill | text | 4.5 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| tabs | focus | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| tabs | focus | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| tabs | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| tabs | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| tabs | active | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| tabs | disabled | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| tabs | disabled | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| tabs | disabled | icon on {surface} | non-text | 3 | 2.16 (#b1adaa / #fdfbfb) | 2.66 (#656360 / #22221f) | info: below · inactive control; the reason states why |
| tabs | loading | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| tabs | loading | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| tabs | error | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| tabs | error | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| tabs | error | icon on {surface} | non-text | 3 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| tabs | error | icon on {background} | non-text | 3 | 5.76 (#974843 / #f6f4f3) | 8.48 (#f49c95 / #191816) | PASS |
| tabs | success | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| tabs | success | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| sidebar-item.variant.current | variant:current | text on fill | text | 4.5 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| sidebar-item.variant.current | variant:current | icon on fill | non-text | 3 | 8.43 (#23482e / #e4ebd9) | 7.04 (#b9cf9b / #2f3b22) | PASS |
| sidebar-item.variant.current | variant:current | marker on fill | non-text | 3 | 3.91 (#577d37 / #e4ebd9) | 6.44 (#b1c698 / #2f3b22) | PASS |
| sidebar-item | default | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| sidebar-item | default | icon on {surface} | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| sidebar-item | hover | text on fill | text | 4.5 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| sidebar-item | hover | icon on fill | non-text | 3 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| sidebar-item | focus | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| sidebar-item | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| sidebar-item | active | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| sidebar-item | disabled | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | info: clears · inactive; in practice hidden by permission |
| sidebar-item | error | text on {surface} | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| sidebar-item | success | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| panel | default | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| panel | default | border on {background} | non-text | 3 | 1.26 (#dddbd9 / #f6f4f3) | 1.77 (#43423f / #191816) | info: below · a panel edge is a hairline; not a control boundary |
| panel | hover | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| panel | focus | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| panel | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| panel | active | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| panel | disabled | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| panel | loading | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| panel | error | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| panel | success | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | default | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | default | title on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | hover | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | focus | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | focus | ring on fill | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| dialog | active | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | disabled | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | loading | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | error | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| dialog | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| dialog | success | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
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
| alert.variant.neutral | variant:neutral | text on fill | text | 4.5 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | PASS |
| alert.variant.neutral | variant:neutral | icon on fill | non-text | 3 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | PASS |
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
| alert | loading | text on fill | text | 4.5 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | PASS |
| alert | loading | bar on track | non-text | 3 | 3.16 (#85837e / #eceae8) | 3.29 (#83807b / #33312f) | PASS |
| alert | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert | error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert | success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| alert | success | icon on fill | non-text | 3 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| toast | default | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| toast | default | action on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| toast | hover | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| toast | hover | action on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| toast | focus | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| toast | focus | action on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| toast | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| toast | active | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| toast | active | action on fill | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| toast | disabled | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| toast | loading | text on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| toast | error | text on fill | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| toast | error | icon on fill | non-text | 3 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| toast | success | text on fill | text | 4.5 | 5.51 (#337437 / #fdfbfb) | 8.32 (#88cb8a / #22221f) | PASS |
| toast | success | icon on fill | non-text | 3 | 5.51 (#337437 / #fdfbfb) | 8.32 (#88cb8a / #22221f) | PASS |
| table.variant.selected | variant:selected | text on fill | text | 4.5 | 9.03 (#443c16 / #e4ebd9) | 9.48 (#efe4da / #2f3b22) | PASS |
| table.variant.selected | variant:selected | marker on fill | non-text | 3 | 3.91 (#577d37 / #e4ebd9) | 6.44 (#b1c698 / #2f3b22) | PASS |
| table.variant.header | variant:header | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| table.variant.header | variant:header | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| table | default | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| table | default | text on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| table | default | link on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| table | default | link on {background} | text | 4.5 | 9.40 (#23482e / #f6f4f3) | 10.53 (#b9cf9b / #191816) | PASS |
| table | hover | text on fill | text | 4.5 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| table | hover | secondary on fill | text | 4.5 | 5.52 (#6a5f49 / #f2f0ee) | 8.18 (#d5c0a8 / #2a2a27) | PASS |
| table | focus | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| table | focus | text on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| table | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| table | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| table | active | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| table | disabled | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | info: clears · inactive row; toggletip states why |
| table | disabled | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | info: clears · inactive row; toggletip states why |
| table | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| table | success | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| table | success | text on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| data-grid | default | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| data-grid | default | text on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| data-grid | default | header on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| data-grid | default | header on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| data-grid | hover | text on fill | text | 4.5 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| data-grid | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| data-grid | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| data-grid | active | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| data-grid | disabled | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | info: clears · inactive row |
| data-grid | disabled | text on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | info: clears · inactive row |
| data-grid | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| data-grid | success | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| data-grid | success | text on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| kpi-tile | default | value on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| kpi-tile | default | label on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| kpi-tile | default | icon on fill | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| kpi-tile | default | trend on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| kpi-tile | hover | value on fill | text | 4.5 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| kpi-tile | hover | label on fill | text | 4.5 | 5.52 (#6a5f49 / #f2f0ee) | 8.18 (#d5c0a8 / #2a2a27) | PASS |
| kpi-tile | focus | value on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| kpi-tile | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| kpi-tile | active | value on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| kpi-tile | disabled | value on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| kpi-tile | loading | label on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| kpi-tile | error | label on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| kpi-tile | error | value on fill | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| kpi-tile | error | icon on fill | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| kpi-tile | error | error-glyph on fill | non-text | 3 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| kpi-tile | success | value on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| empty-state.variant.no-action | variant:no-action | title on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| empty-state.variant.no-action | variant:no-action | title on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| empty-state.variant.no-action | variant:no-action | copy on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| empty-state.variant.no-action | variant:no-action | copy on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| empty-state | default | title on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| empty-state | default | title on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| empty-state | default | copy on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| empty-state | default | copy on {background} | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| empty-state | default | ruler on {surface} | non-text | 3 | 2.16 (#b1adaa / #fdfbfb) | 2.66 (#656360 / #22221f) | info: below · the ruler is a decorative rule by lock |
| empty-state | default | ruler on {background} | non-text | 3 | 2.03 (#b1adaa / #f6f4f3) | 2.96 (#656360 / #191816) | info: below · the ruler is a decorative rule by lock |
| empty-state | hover | title on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| empty-state | hover | title on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| empty-state | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| empty-state | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| empty-state | active | title on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| empty-state | active | title on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| empty-state | disabled | title on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| empty-state | disabled | title on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| empty-state | error | title on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| empty-state | error | title on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| empty-state | error | copy on {surface} | text | 4.5 | 6.13 (#974843 / #fdfbfb) | 7.62 (#f49c95 / #22221f) | PASS |
| empty-state | error | copy on {background} | text | 4.5 | 5.76 (#974843 / #f6f4f3) | 8.48 (#f49c95 / #191816) | PASS |
| empty-state | success | title on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| empty-state | success | title on {background} | text | 4.5 | 10.06 (#443c16 / #f6f4f3) | 14.18 (#efe4da / #191816) | PASS |
| display-menu | default | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| display-menu | default | group-label on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| display-menu | default | check on fill | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| display-menu | hover | text on fill | text | 4.5 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| display-menu | focus | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| display-menu | focus | ring on fill | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| display-menu | active | text on fill | text | 4.5 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| display-menu | disabled | text on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | info: clears · inactive |
| display-menu | loading | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| display-menu | error | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| display-menu | error | caption on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| display-menu | success | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| display-menu | success | check on fill | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| launcher.variant.badge | variant:badge | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| launcher | default | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| launcher | default | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| launcher | default | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| launcher | default | fill on {surface} | non-text | 3 | 1.38 (#d0ddbd / #fdfbfb) | 1.49 (#354225 / #22221f) | info: below · the Soft sage fill is a tint, not the boundary: the 1 px --accent-solid-border edge is |
| launcher | hover | icon on fill | non-text | 3 | 6.71 (#23482e / #c7d6b1) | 7.26 (#efe4da / #3f4d2d) | PASS |
| launcher | hover | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| launcher | hover | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| launcher | focus | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| launcher | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| launcher | focus | ring on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| launcher | focus | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| launcher | focus | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 9.63 (#b1c698 / #191816) | PASS |
| launcher | active | icon on fill | non-text | 3 | 6.18 (#23482e / #bfcea6) | 6.08 (#efe4da / #495934) | PASS |
| launcher | active | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| launcher | active | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| launcher | loading | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| launcher | loading | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| launcher | loading | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| launcher | error | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| launcher | error | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| launcher | error | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| launcher | success | icon on fill | non-text | 3 | 7.24 (#23482e / #d0ddbd) | 8.57 (#efe4da / #354225) | PASS |
| launcher | success | border on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 5.23 (#859b69 / #22221f) | PASS |
| launcher | success | border on {background} | non-text | 3 | 4.36 (#577d37 / #f6f4f3) | 5.82 (#859b69 / #191816) | PASS |
| tutor-message | default | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| tutor-message | default | link on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| tutor-message | default | code on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| tutor-message | default | citation on {surface} | text | 4.5 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| tutor-message | default | toolbar on {surface} | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| tutor-message | hover | toolbar on toolbar-fill | non-text | 3 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| tutor-message | focus | ring on {surface} | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| tutor-message | active | toolbar on toolbar-fill | non-text | 3 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| tutor-message | disabled | toolbar on {surface} | non-text | 3 | 2.16 (#b1adaa / #fdfbfb) | 2.66 (#656360 / #22221f) | info: below · inactive control; toggletip "Not available yet" |
| tutor-message | loading | text on {surface} | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| tutor-message | loading | stop on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| tutor-message | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| tutor-message | error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| tutor-message | success | text on {surface} | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| tutor-message | success | thumb-chosen on {surface} | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| tutor-message.variant.thumb-chosen | variant:thumb-chosen | glyph on {surface} | non-text | 3 | 9.99 (#23482e / #fdfbfb) | 9.46 (#b9cf9b / #22221f) | PASS |
| pdf-toolbar.variant.page-current | variant:page-current | outline on canvas | non-text | 3 | 3.45 (#85837e / #f6f4f3) | 4.51 (#83807b / #191816) | PASS |
| pdf-toolbar.variant.pin-visible | variant:pin-visible | fill on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.pin-visible | variant:pin-visible | glyph on fill | non-text | 3 | 13.43 (#ffffff / #203327) | 13.43 (#ffffff / #203327) | PASS |
| pdf-toolbar.variant.pin-hidden | variant:pin-hidden | ring on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.pin-hidden | variant:pin-hidden | glyph on fill | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.chunk | variant:chunk | box on page | non-text | 3 | 6.28 (#6a5f49 / #ffffff) | 6.28 (#6a5f49 / #ffffff) | PASS |
| pdf-toolbar.variant.chunk | variant:chunk | selected on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.thumbnails | variant:thumbnails | outline on canvas | non-text | 3 | 3.45 (#85837e / #f6f4f3) | 4.51 (#83807b / #191816) | PASS |
| pdf-toolbar.variant.thumbnails | variant:thumbnails | label on canvas | text | 4.5 | 5.72 (#6a5f49 / #f6f4f3) | 10.08 (#d5c0a8 / #191816) | PASS |
| pdf-toolbar.variant.rail | variant:rail | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| pdf-toolbar.variant.rail | variant:rail | heading on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| pdf-toolbar.variant.search-panel | variant:search-panel | text on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| pdf-toolbar.variant.search-panel | variant:search-panel | status on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| pdf-toolbar.variant.banner | variant:banner | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar.variant.banner | variant:banner | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar.variant.banner | variant:banner | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar | default | title on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| pdf-toolbar | default | label on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| pdf-toolbar | default | icon on fill | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| pdf-toolbar | default | field-text on field-fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| pdf-toolbar | default | field-border on fill | non-text | 3 | 3.67 (#85837e / #fdfbfb) | 4.05 (#83807b / #22221f) | PASS |
| pdf-toolbar | default | frame on canvas | non-text | 3 | 1.26 (#dddbd9 / #f6f4f3) | 1.77 (#43423f / #191816) | info: below · the paper's frame is a hairline by lock |
| pdf-toolbar | hover | icon on button-fill | non-text | 3 | 9.70 (#443c16 / #f2f0ee) | 11.50 (#efe4da / #2a2a27) | PASS |
| pdf-toolbar | hover | title on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| pdf-toolbar | focus | ring on fill | non-text | 3 | 4.64 (#577d37 / #fdfbfb) | 8.66 (#b1c698 / #22221f) | PASS |
| pdf-toolbar | focus | icon on fill | non-text | 3 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| pdf-toolbar | active | icon on button-fill | non-text | 3 | 9.19 (#443c16 / #eceae8) | 10.35 (#efe4da / #33312f) | PASS |
| pdf-toolbar | disabled | icon on fill | non-text | 3 | 2.16 (#b1adaa / #fdfbfb) | 2.66 (#656360 / #22221f) | info: below · inactive control; the toggletip and helper state why |
| pdf-toolbar | disabled | title on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| pdf-toolbar | loading | label on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| pdf-toolbar | loading | title on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| pdf-toolbar | error | alert-text on alert-fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| pdf-toolbar | error | alert-icon on alert-fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| pdf-toolbar | error | title on fill | text | 4.5 | 10.70 (#443c16 / #fdfbfb) | 12.74 (#efe4da / #22221f) | PASS |
| pdf-toolbar | success | label on fill | text | 4.5 | 6.09 (#6a5f49 / #fdfbfb) | 9.06 (#d5c0a8 / #22221f) | PASS |
| pdf-toolbar | success | chip-text on chip | text | 4.5 | 5.23 (#6a5f49 / #eceae8) | 7.36 (#d5c0a8 / #33312f) | PASS |

## 4. Per-mode closure of the emitted CSS

:root declares 1339 properties. Dark: 850 depend on a mode token (transitively), 850 are redeclared in [data-theme="dark"], 0 missing. Compact: 96 depend on a density token, 96 redeclared in [data-density="compact"], 0 missing. Root-only composites that embed a mode colour (shadows, backdrop): 0.

## 10. Coarse pointer

36 properties depend on a pointer-varying token; the @media (pointer: coarse) block redeclares 36 on :root and 36 / 36 in the density blocks; 0 missing; --size-target-min consumed: yes.

## 8. Tier rule

942 component-tier references, 0 outside the semantic tier (the rule: component tokens reference semantic tokens only, never a global, never another component).

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
| icon-button.variant.selected | marker | marker on {surface} | 4.64 | 8.66 | PASS |
| icon-button.variant.selected | marker | marker on {background} | 4.36 | 9.63 | PASS |
| button.tertiary.variant.pressed | marker | marker on fill | 3.91 | 6.44 | PASS |
| button.tertiary.variant.pressed | marker | marker on {surface} | 4.64 | 8.66 | PASS |
| button.tertiary.variant.pressed | marker | marker on {background} | 4.36 | 9.63 | PASS |
| tutor-message.variant.thumb-chosen | glyph | glyph on {surface} | 9.99 | 9.46 | PASS |
| chip.filter.variant.selected | weight | 600 vs 400 | — | — | PASS |
| tabs.variant.selected | marker | marker on {surface} | 4.64 | 8.66 | PASS |
| tabs.variant.selected | marker | marker on {background} | 4.36 | 9.63 | PASS |
| sidebar-item.variant.current | marker | marker on fill | 3.91 | 6.44 | PASS |
| sidebar-item.variant.current | marker | marker on {surface} | 4.64 | 8.66 | PASS |
| table.variant.selected | marker | marker on fill | 3.91 | 6.44 | PASS |
| table.variant.selected | marker | marker on {surface} | 4.64 | 8.66 | PASS |
| table.variant.selected | marker | marker on {background} | 4.36 | 9.63 | PASS |
| switch.variant.on | position | thumb on track | 8.43 | 7.04 | PASS |
| checkbox.variant.checked | glyph | glyph on fill | 8.43 | 7.04 | PASS |
| checkbox.variant.indeterminate | glyph | glyph on fill | 8.43 | 7.04 | PASS |
| checkbox.variant.radio-checked | glyph | glyph on fill | 8.43 | 7.04 | PASS |
| display-menu.state.default | glyph | check on fill | 9.99 | 9.46 | PASS |

## 15. Frozen literals

4 literals name their source in $extensions["org.kiwi"].frozen; 0 drifted.

| Token | Literal | Source | Resolved | Result |
|---|---|---|---|---|
| semantic.color.on-paper.pin | #203327 | {global.color.accent.12} (light) | #203327 | PASS |
| semantic.color.on-paper.chunk | #6a5f49 | {global.color.neutral.11} (light) | #6a5f49 | PASS |
| semantic.color.on-paper.wash | #2033271f | {semantic.color.on-paper.pin} (light, α 0.12) | #2033271f | PASS |
| companion.backing (mode.dark) | #fdfbfb | {global.color.paper.2} (light) | #fdfbfb | PASS |

## 16. Chart series (Phase 6)

10 series values (five per mode) and the neutral, 0 failures. Gates: ≥ 3:1 on --surface, --background and --surface-hover; OKLCH L within ± 0.07 of one target per mode; chroma 0.1–0.14; hue inside 45°–255°; minimum pairwise OKLab distance (× 100) ≥ 8 under protanopia and deuteranopia (Machado 2009, severity 1.0) and ≥ 15 under normal vision, all pairs; every hex equal to its recorded parameters re-rendered.

- light: target L 0.56, spread 0.13; min contrast 3.02:1; min distance under protanopia 8.14 (series 1 vs 3), adjacent 14.78; min distance under normal vision 15.26 (series 1 vs 2); Other #77746d at 4.1:1, 4.66 from the nearest series under simulation (informational).
- dark: target L 0.634, spread 0.135; min contrast 3.06:1; min distance under deuteranopia 8.16 (series 1 vs 3), adjacent 16.45; min distance under normal vision 15.37 (series 1 vs 4); Other #8d8b83 at 4.22:1, 5.57 from the nearest series under simulation (informational).

| Mode | Token | Hex | Hue | L | C | on --surface | on --background | on --surface-hover | |
|---|---|---|---|---|---|---|---|---|---|
| light | --chart-1 | #2b774d | 155.8° | 0.511 | 0.101 | 5.29 | 4.98 | 4.80 | PASS |
| light | --chart-2 | #0098af | 213.3° | 0.625 | 0.109 | 3.33 | 3.13 | 3.02 | PASS |
| light | --chart-3 | #a64e00 | 51.1° | 0.526 | 0.137 | 5.49 | 5.16 | 4.98 | PASS |
| light | --chart-4 | #0064ad | 249.8° | 0.495 | 0.140 | 5.94 | 5.59 | 5.39 | PASS |
| light | --chart-5 | #958b00 | 104.5° | 0.626 | 0.132 | 3.41 | 3.21 | 3.09 | PASS |
| light | --chart-other | #77746d | 87.5° | 0.559 | 0.011 | 4.52 | 4.25 | 4.10 | PASS |
| dark | --chart-1 | #3f895e | 155.8° | 0.571 | 0.100 | 3.76 | 4.18 | 3.39 | PASS |
| dark | --chart-2 | #00b2cc | 212.9° | 0.701 | 0.123 | 6.26 | 6.96 | 5.65 | PASS |
| dark | --chart-3 | #b65a15 | 50.8° | 0.570 | 0.140 | 3.39 | 3.77 | 3.06 | PASS |
| dark | --chart-4 | #3e7ab4 | 249.7° | 0.566 | 0.110 | 3.53 | 3.93 | 3.19 | PASS |
| dark | --chart-5 | #a99d15 | 103.8° | 0.685 | 0.140 | 5.71 | 6.35 | 5.15 | PASS |
| dark | --chart-other | #8d8b83 | 95.2° | 0.636 | 0.012 | 4.67 | 5.20 | 4.22 | PASS |

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
| --chart-grid | {semantic.color.border-subtle} | #e5e3e1 | #363533 | PASS |
| --chart-baseline | {semantic.color.border-strong} | #b1adaa | #656360 | PASS |
| --chart-tick-text | {semantic.color.text-secondary} | #6a5f49 | #d5c0a8 | PASS |
| --chart-plot | {semantic.color.surface} | #fdfbfb | #22221f | PASS |

## 17. Editor selection

23 assertions, 0 failures: the selection is a visible tint on --editor-bg, differs from the active line, carries a 1 px --editor-selection-outline that clears 3:1 against the surface and the active line, and keeps every syntax colour at 4.5:1.

| Assertion | Light | Dark | Result |
|---|---|---|---|
| selection tint on --editor-bg ≥ 1.1:1 (a visible tint, not 1:1) | 1.26 | 1.55 | PASS |
| selection differs from the active line | #dce5cc vs #eceae8 | #374525 vs #33312f | PASS |
| selection outline on --editor-bg ≥ 3:1 | 4.64 | 8.66 | PASS |
| selection outline on the active line ≥ 3:1 | 3.98 | 7.03 | PASS |
| selection on the active line (tint alone, informational: the outline carries it) | 1.09 | 1.26 | PASS |
| syntax.keyword on the selection ≥ 4.5:1 | 8.47 | 8.22 | PASS |
| syntax.builtin on the selection ≥ 4.5:1 | 8.47 | 8.22 | PASS |
| syntax.type on the selection ≥ 4.5:1 | 8.47 | 8.22 | PASS |
| syntax.class on the selection ≥ 4.5:1 | 8.47 | 8.22 | PASS |
| syntax.function on the selection ≥ 4.5:1 | 8.47 | 8.22 | PASS |
| syntax.variable on the selection ≥ 4.5:1 | 8.47 | 8.22 | PASS |
| syntax.operator on the selection ≥ 4.5:1 | 4.82 | 5.85 | PASS |
| syntax.punctuation on the selection ≥ 4.5:1 | 4.82 | 5.85 | PASS |
| syntax.comment on the selection ≥ 4.5:1 | 4.82 | 5.85 | PASS |
| syntax.string on the selection ≥ 4.5:1 | 4.82 | 6.11 | PASS |
| syntax.number on the selection ≥ 4.5:1 | 4.58 | 5.20 | PASS |
| syntax.constant on the selection ≥ 4.5:1 | 4.58 | 5.20 | PASS |
| syntax.decorator on the selection ≥ 4.5:1 | 4.82 | 5.85 | PASS |
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

## 20. Companion (Phase 4; companion v2, 2026-10-19)

39 required pairs (the status line's Kiwi and words, the composer peek, the original logo, the round launcher; non-text 3:1, the words 4.5:1), 0 below; 109 shipped assets pixel-sampled (every status-line cell, the peek's atlas, the logo at 7 sizes, the launcher in 3 states), 0 below 3.

| Mode | Pair | Colours | Ratio | Target | |
|---|---|---|---|---|---|
| light | the line's Kiwi: forest on --surface | #234631 / #fdfbfb | 10.23 | ≥ 3 | PASS |
| light | the line's Kiwi: forest on --background | #234631 / #f6f4f3 | 9.62 | ≥ 3 | PASS |
| light | the line's Kiwi: forest on --surface-hover | #234631 / #f2f0ee | 9.27 | ≥ 3 | PASS |
| light | the line's Kiwi: forest on --surface-active | #234631 / #eceae8 | 8.79 | ≥ 3 | PASS |
| light | the line's Kiwi: forest on --accent-bg-subtle | #234631 / #eaf0df | 9.05 | ≥ 3 | PASS |
| light | the line's Kiwi: forest on --status-error-surface | #234631 / #ffebe9 | 9.19 | ≥ 3 | PASS |
| dark | the line's Kiwi: its cream rim on --surface | #f5f4e8 / #22221f | 14.42 | ≥ 3 | PASS |
| dark | the line's Kiwi: its cream rim on --background | #f5f4e8 / #191816 | 16.04 | ≥ 3 | PASS |
| dark | the line's Kiwi: its cream rim on --surface-hover | #f5f4e8 / #2a2a27 | 13.02 | ≥ 3 | PASS |
| dark | the line's Kiwi: its cream rim on --surface-active | #f5f4e8 / #33312f | 11.71 | ≥ 3 | PASS |
| dark | the line's Kiwi: its cream rim on --accent-bg-subtle | #f5f4e8 / #27321f | 12.15 | ≥ 3 | PASS |
| dark | the line's Kiwi: its cream rim on --status-error-surface | #f5f4e8 / #331a18 | 14.59 | ≥ 3 | PASS |
| dark | the line's Kiwi: forest on its cream rim | #234631 / #f5f4e8 | 9.53 | ≥ 3 | PASS |
| light | the line's words: companion.line.ink on --surface | #23482e / #fdfbfb | 9.99 | ≥ 4.5 | PASS |
| light | the line's words: companion.line.ink on --background | #23482e / #f6f4f3 | 9.40 | ≥ 4.5 | PASS |
| light | the line's words: companion.line.ink on --surface-hover | #23482e / #f2f0ee | 9.07 | ≥ 4.5 | PASS |
| light | the line's words: companion.line.ink on --surface-active | #23482e / #eceae8 | 8.59 | ≥ 4.5 | PASS |
| light | the line's words: companion.line.ink on --accent-bg-subtle | #23482e / #eaf0df | 8.85 | ≥ 4.5 | PASS |
| light | the line's words: companion.line.ink on --status-error-surface | #23482e / #ffebe9 | 8.99 | ≥ 4.5 | PASS |
| dark | the line's words: companion.line.ink on --surface | #b9cf9b / #22221f | 9.46 | ≥ 4.5 | PASS |
| dark | the line's words: companion.line.ink on --background | #b9cf9b / #191816 | 10.53 | ≥ 4.5 | PASS |
| dark | the line's words: companion.line.ink on --surface-hover | #b9cf9b / #2a2a27 | 8.54 | ≥ 4.5 | PASS |
| dark | the line's words: companion.line.ink on --surface-active | #b9cf9b / #33312f | 7.69 | ≥ 4.5 | PASS |
| dark | the line's words: companion.line.ink on --accent-bg-subtle | #b9cf9b / #27321f | 7.98 | ≥ 4.5 | PASS |
| dark | the line's words: companion.line.ink on --status-error-surface | #b9cf9b / #331a18 | 9.57 | ≥ 4.5 | PASS |
| dark | the composer peek: forest on its backing disc (companion.backing) | #234631 / #fdfbfb | 10.23 | ≥ 3 | PASS |
| both | the original logo: forest on its sage | #234631 / #92ae70 | 4.27 | ≥ 3 | PASS |
| both | the launcher: the bird on its sage ground, at rest | #234631 / #92ae70 | 4.27 | ≥ 3 | PASS |
| both | the launcher: the bubble on its sage ground, at rest | #234631 / #92ae70 | 4.27 | ≥ 3 | PASS |
| both | the launcher: the bird on its sage ground, hovered | #234631 / #87a46a | 3.79 | ≥ 3 | PASS |
| both | the launcher: the bubble on its sage ground, hovered | #234631 / #87a46a | 3.79 | ≥ 3 | PASS |
| both | the launcher: the bird on its sage ground, pressed | #234631 / #7e9b65 | 3.40 | ≥ 3 | PASS |
| both | the launcher: the bubble on its sage ground, pressed | #234631 / #7e9b65 | 3.40 | ≥ 3 | PASS |
| light | the launcher: its edge (--launcher-border) on --background | #577d37 / #f6f4f3 | 4.36 | ≥ 3 | PASS |
| light | the launcher: its edge (--launcher-border) on --surface | #577d37 / #fdfbfb | 4.64 | ≥ 3 | PASS |
| light | the launcher: its sage ground on --background (the edge carries the boundary) | #92ae70 / #f6f4f3 | 2.25 | — | informational |
| light | the launcher: its sage ground on --surface (the edge carries the boundary) | #92ae70 / #fdfbfb | 2.39 | — | informational |
| light | the launcher: forest where the circle cuts the bird, on --background (why the edge runs over it) | #234631 / #f6f4f3 | 9.62 | — | informational |
| light | the launcher: forest where the circle cuts the bird, on --surface (why the edge runs over it) | #234631 / #fdfbfb | 10.23 | — | informational |
| light | the launcher: its edge on its sage | #577d37 / #92ae70 | 1.94 | — | informational |
| light | the original logo: its sage tile's edge on --surface | #92ae70 / #fdfbfb | 2.39 | — | informational |
| light | the original logo: its sage tile's edge on --background | #92ae70 / #f6f4f3 | 2.25 | — | informational |
| light | the original logo: its sage tile's edge on --surface-hover | #92ae70 / #f2f0ee | 2.17 | — | informational |
| light | the original logo: its sage tile's edge on --surface-active | #92ae70 / #eceae8 | 2.06 | — | informational |
| light | the original logo: its sage tile's edge on --accent-bg-subtle | #92ae70 / #eaf0df | 2.12 | — | informational |
| light | the original logo: its sage tile's edge on --status-error-surface | #92ae70 / #ffebe9 | 2.15 | — | informational |
| dark | the launcher: its edge (--launcher-border) on --background | #859b69 / #191816 | 5.82 | ≥ 3 | PASS |
| dark | the launcher: its edge (--launcher-border) on --surface | #859b69 / #22221f | 5.23 | ≥ 3 | PASS |
| dark | the launcher: its sage ground on --background | #92ae70 / #191816 | 7.19 | ≥ 3 | PASS |
| dark | the launcher: its sage ground on --surface | #92ae70 / #22221f | 6.46 | ≥ 3 | PASS |
| dark | the launcher: forest where the circle cuts the bird, on --background (why the edge runs over it) | #234631 / #191816 | 1.68 | — | informational |
| dark | the launcher: forest where the circle cuts the bird, on --surface (why the edge runs over it) | #234631 / #22221f | 1.51 | — | informational |
| dark | the launcher: its edge on its sage | #859b69 / #92ae70 | 1.24 | — | informational |
| dark | the original logo: its sage tile's edge on --surface | #92ae70 / #22221f | 6.46 | — | informational |
| dark | the original logo: its sage tile's edge on --background | #92ae70 / #191816 | 7.19 | — | informational |
| dark | the original logo: its sage tile's edge on --surface-hover | #92ae70 / #2a2a27 | 5.83 | — | informational |
| dark | the original logo: its sage tile's edge on --surface-active | #92ae70 / #33312f | 5.25 | — | informational |
| dark | the original logo: its sage tile's edge on --accent-bg-subtle | #92ae70 / #27321f | 5.45 | — | informational |
| dark | the original logo: its sage tile's edge on --status-error-surface | #92ae70 / #331a18 | 6.54 | — | informational |
| both | the tan bill on the sage (not the outline) | #ccbd99 / #92ae70 | 1.33 | — | informational |

| Asset (pixel-sampled) | Sample | Ratio | Ratio (dark sheet) | |
|---|---|---|---|---|
| line/walk.light.webp cell 0 | #4d6046 | 5.69 | — | PASS |
| line/walk.light.webp cell 1 | #48624f | 5.58 | — | PASS |
| line/walk.light.webp cell 2 | #5e7263 | 4.31 | — | PASS |
| line/walk.light.webp cell 3 | #556d5e | 4.69 | — | PASS |
| line/walk.light.webp cell 4 | #577062 | 4.49 | — | PASS |
| line/walk.light.webp cell 5 | #59684d | 4.98 | — | PASS |
| line/walk.light.webp cell 6 | #506347 | 5.44 | — | PASS |
| line/walk.light.webp cell 7 | #4c6957 | 5.05 | — | PASS |
| line/walk.light.webp cell 8 | #455f50 | 5.82 | — | PASS |
| line/walk.light.webp cell 9 | #5d7462 | 4.23 | — | PASS |
| line/walk.light.webp cell 10 | #5b674e | 5.01 | — | PASS |
| line/walk.light.webp cell 11 | #496252 | 5.55 | — | PASS |
| line/walk.light.webp cell 12 | #5d7160 | 4.38 | — | PASS |
| line/walk.light.webp cell 13 | #425f4c | 5.89 | — | PASS |
| line/walk.light.webp cell 14 | #58705f | 4.49 | — | PASS |
| line/walk.light.webp cell 15 | #46604e | 5.75 | — | PASS |
| line/walk.light.webp cell 16 | #576449 | 5.26 | — | PASS |
| line/walk.light.webp cell 17 | #5d694e | 4.87 | — | PASS |
| line/walk.light.webp cell 18 | #4e6045 | 5.68 | — | PASS |
| line/walk.light.webp cell 19 | #5f7767 | 4.05 | — | PASS |
| line/walk.light.webp cell 20 | #617566 | 4.12 | — | PASS |
| line/walk.light.webp cell 21 | #5e7665 | 4.11 | — | PASS |
| line/walk.light.webp cell 22 | #607466 | 4.18 | — | PASS |
| line/walk.light.webp cell 23 | #617466 | 4.17 | — | PASS |
| line/walk.dark.webp cell 0 | #d8cbb0 | 8.07 | 9.94 | PASS |
| line/walk.dark.webp cell 1 | #c9cec1 | 8.07 | 9.94 | PASS |
| line/walk.dark.webp cell 2 | #d7c9ae | 7.93 | 9.76 | PASS |
| line/walk.dark.webp cell 3 | #d9c9ac | 7.96 | 9.80 | PASS |
| line/walk.dark.webp cell 4 | #d9caac | 8.02 | 9.87 | PASS |
| line/walk.dark.webp cell 5 | #d8c9ab | 7.93 | 9.77 | PASS |
| line/walk.dark.webp cell 6 | #c9cec1 | 8.07 | 9.94 | PASS |
| line/walk.dark.webp cell 7 | #d6c9ae | 7.91 | 9.74 | PASS |
| line/walk.dark.webp cell 8 | #d7c9af | 7.93 | 9.77 | PASS |
| line/walk.dark.webp cell 9 | #d6c9ac | 7.90 | 9.73 | PASS |
| line/walk.dark.webp cell 10 | #c9cec2 | 8.08 | 9.94 | PASS |
| line/walk.dark.webp cell 11 | #d6cbb1 | 8.04 | 9.90 | PASS |
| line/walk.dark.webp cell 12 | #d7c9ae | 7.93 | 9.76 | PASS |
| line/walk.dark.webp cell 13 | #d8caae | 8.01 | 9.86 | PASS |
| line/walk.dark.webp cell 14 | #d7c9ac | 7.92 | 9.75 | PASS |
| line/walk.dark.webp cell 15 | #d9ccb2 | 8.16 | 10.05 | PASS |
| line/walk.dark.webp cell 16 | #c9cec1 | 8.07 | 9.94 | PASS |
| line/walk.dark.webp cell 17 | #d8cbae | 8.06 | 9.93 | PASS |
| line/walk.dark.webp cell 18 | #d7ccb1 | 8.12 | 10.00 | PASS |
| line/walk.dark.webp cell 19 | #d8caab | 7.99 | 9.84 | PASS |
| line/walk.dark.webp cell 20 | #d6caad | 7.96 | 9.81 | PASS |
| line/walk.dark.webp cell 21 | #d7cbb1 | 8.06 | 9.92 | PASS |
| line/walk.dark.webp cell 22 | #cacfc2 | 8.15 | 10.04 | PASS |
| line/walk.dark.webp cell 23 | #cacfc1 | 8.15 | 10.03 | PASS |
| line/hop.light.webp cell 0 | #4c6550 | 5.33 | — | PASS |
| line/hop.light.webp cell 1 | #445f4a | 5.87 | — | PASS |
| line/hop.light.webp cell 2 | #617a67 | 3.90 | — | PASS |
| line/hop.light.webp cell 3 | #49634f | 5.50 | — | PASS |
| line/hop.light.webp cell 4 | #5a715c | 4.43 | — | PASS |
| line/hop.light.webp cell 5 | #566d57 | 4.70 | — | PASS |
| line/hop.light.webp cell 6 | #5f7562 | 4.16 | — | PASS |
| line/hop.light.webp cell 7 | #526b57 | 4.86 | — | PASS |
| line/hop.light.webp cell 8 | #58705b | 4.51 | — | PASS |
| line/hop.light.webp cell 9 | #5b715f | 4.41 | — | PASS |
| line/hop.light.webp cell 10 | #5f745f | 4.22 | — | PASS |
| line/hop.light.webp cell 11 | #556a58 | 4.88 | — | PASS |
| line/hop.light.webp cell 12 | #5a715c | 4.43 | — | PASS |
| line/hop.light.webp cell 13 | #4a5a40 | 6.19 | — | PASS |
| line/hop.light.webp cell 14 | #627865 | 3.98 | — | PASS |
| line/hop.light.webp cell 15 | #627b65 | 3.85 | — | PASS |
| line/hop.light.webp cell 16 | #5a725e | 4.37 | — | PASS |
| line/hop.light.webp cell 17 | #4e6752 | 5.17 | — | PASS |
| line/hop.light.webp cell 18 | #556d5a | 4.70 | — | PASS |
| line/hop.light.webp cell 19 | #566649 | 5.16 | — | PASS |
| line/hop.light.webp cell 20 | #566c58 | 4.75 | — | PASS |
| line/hop.light.webp cell 21 | #4e6754 | 5.16 | — | PASS |
| line/hop.light.webp cell 22 | #586d59 | 4.67 | — | PASS |
| line/hop.light.webp cell 23 | #5a6748 | 5.05 | — | PASS |
| line/hop.dark.webp cell 0 | #c9cfc2 | 8.13 | 10.02 | PASS |
| line/hop.dark.webp cell 1 | #c9cec0 | 8.06 | 9.93 | PASS |
| line/hop.dark.webp cell 2 | #dac9af | 7.99 | 9.84 | PASS |
| line/hop.dark.webp cell 3 | #dacaaf | 8.05 | 9.91 | PASS |
| line/hop.dark.webp cell 4 | #dcccb1 | 8.21 | 10.11 | PASS |
| line/hop.dark.webp cell 5 | #dacaaf | 8.05 | 9.91 | PASS |
| line/hop.dark.webp cell 6 | #d9cbb1 | 8.10 | 9.97 | PASS |
| line/hop.dark.webp cell 7 | #c9cec1 | 8.07 | 9.94 | PASS |
| line/hop.dark.webp cell 8 | #c9cec1 | 8.07 | 9.94 | PASS |
| line/hop.dark.webp cell 9 | #d9cab0 | 8.03 | 9.89 | PASS |
| line/hop.dark.webp cell 10 | #dac9ae | 7.99 | 9.83 | PASS |
| line/hop.dark.webp cell 11 | #dacab0 | 8.05 | 9.92 | PASS |
| line/hop.dark.webp cell 12 | #dac9ac | 7.98 | 9.82 | PASS |
| line/hop.dark.webp cell 13 | #d7c9af | 7.93 | 9.77 | PASS |
| line/hop.dark.webp cell 14 | #d6c9af | 7.92 | 9.75 | PASS |
| line/hop.dark.webp cell 15 | #dac9ae | 7.99 | 9.83 | PASS |
| line/hop.dark.webp cell 16 | #d7c9af | 7.93 | 9.77 | PASS |
| line/hop.dark.webp cell 17 | #d9caaf | 8.03 | 9.89 | PASS |
| line/hop.dark.webp cell 18 | #dac9af | 7.99 | 9.84 | PASS |
| line/hop.dark.webp cell 19 | #dacab0 | 8.05 | 9.92 | PASS |
| line/hop.dark.webp cell 20 | #d9c9ac | 7.96 | 9.80 | PASS |
| line/hop.dark.webp cell 21 | #d8cab2 | 8.03 | 9.88 | PASS |
| line/hop.dark.webp cell 22 | #d8c9ae | 7.95 | 9.79 | PASS |
| line/hop.dark.webp cell 23 | #d8cab0 | 8.02 | 9.87 | PASS |
| line/stand.light.webp cell 0 | #5a6748 | 5.05 | — | PASS |
| line/stand.dark.webp cell 0 | #d8cab0 | 8.02 | 9.87 | PASS |
| atlas/stamp-peek.96.webp | #5f7565 | 4.83 | 4.15 | PASS |
| kiwi-mark.svg at 16 px | #234631 | 4.27 | — | PASS |
| kiwi-mark.svg at 24 px | #234631 | 4.27 | — | PASS |
| kiwi-mark.svg at 28 px | #234631 | 4.27 | — | PASS |
| kiwi-mark.svg at 32 px | #234631 | 4.27 | — | PASS |
| kiwi-mark.svg at 48 px | #234631 | 4.27 | — | PASS |
| kiwi-mark.svg at 64 px | #234631 | 4.27 | — | PASS |
| kiwi-mark.svg at 96 px | #234631 | 4.27 | — | PASS |
| launcher-round.svg, rest | #234631 | 4.27 | — | PASS |
| launcher-round.svg, hovered | #234631 | 3.79 | — | PASS |
| launcher-round.svg, pressed | #234631 | 3.40 | — | PASS |

## 21. Global provenance (2026-10-18 re-lock)

83 global colour values (per mode): 19 taken as given from the reference, 38 OKLCH derivations re-rendered from their recorded parameters, 26 kept from the 2026-10-16 lock; 0 failures. The neutral, accent and paper ramps are monotonic in OKLCH lightness in both modes.

| Ramp | Mode | OKLCH L, step 1 → last | |
|---|---|---|---|
| neutral | light | 0.986 → 0.973 → 0.956 → 0.938 → 0.927 → 0.917 → 0.892 → 0.750 → 0.681 → 0.610 → 0.490 → 0.355 | PASS |
| neutral | dark | 0.186 → 0.221 → 0.256 → 0.284 → 0.315 → 0.329 → 0.379 → 0.501 → 0.550 → 0.601 → 0.819 → 0.925 | PASS |
| accent | light | 0.985 → 0.967 → 0.946 → 0.930 → 0.908 → 0.879 → 0.855 → 0.829 → 0.714 → 0.545 → 0.366 → 0.301 | PASS |
| accent | dark | 0.199 → 0.251 → 0.301 → 0.334 → 0.359 → 0.369 → 0.399 → 0.440 → 0.659 → 0.799 → 0.825 → 0.920 | PASS |
| paper | light | 0.995 → 0.990 → 0.968 → 0.947 | PASS |
| paper | dark | 0.186 → 0.209 → 0.251 → 0.285 | PASS |

| Mode | Global | Value | Source | |
|---|---|---|---|---|
| light | --neutral-1 | #fbfafa | derived oklch(0.987 0.0011 51.5): the re-tune's transform of #fbfbf7 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| dark | --neutral-1 | #131312 | derived oklch(0.1865 0.0029 98.73): the re-tune's transform of #0e1510 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-2 | #f7f6f4 | derived oklch(0.9729 0.0024 56.75): the re-tune's transform of #f6f7ee (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| dark | --neutral-2 | #1b1b19 | derived oklch(0.2201 0.0036 93.37): the re-tune's transform of #151d16 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-3 | #f2f0ee | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): the hover row #f2f0ee, the transform of #f0f2e5 | PASS |
| dark | --neutral-3 | #242321 | derived oklch(0.2558 0.0044 92.59): the re-tune's transform of #1c261d (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-4 | #eceae8 | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): the pressed row #eceae8, the transform of #e8eddf | PASS |
| dark | --neutral-4 | #2a2a27 | derived oklch(0.2833 0.0047 92.36): the re-tune's transform of #222d23 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-5 | #e9e6e4 | derived oklch(0.9274 0.0036 65.7): the re-tune's transform of #e5e9dc (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| dark | --neutral-5 | #33312f | derived oklch(0.3147 0.0052 87.75): the re-tune's transform of #2a3529 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-6 | #e5e3e1 | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): the subtle rule #e5e3e1, the transform of #e1e6d8 | PASS |
| dark | --neutral-6 | #363533 | derived oklch(0.3298 0.0041 84.43): the re-tune's transform of #30382e (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-7 | #dddbd9 | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): the hairline #dddbd9, the transform of #d9ded0 | PASS |
| dark | --neutral-7 | #43423f | derived oklch(0.3791 0.0045 80.13): the re-tune's transform of #3d4539 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-8 | #b1adaa | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): the ruler #b1adaa, the transform of #a9b29d | PASS |
| dark | --neutral-8 | #656360 | derived oklch(0.5006 0.006 74.15): the re-tune's transform of #5e6755 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-9 | #9b9894 | derived oklch(0.6809 0.0068 74.03): the re-tune's transform of #929d87 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| dark | --neutral-9 | #74716d | derived oklch(0.5506 0.0066 76.02): the re-tune's transform of #6b7662 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-10 | #85837e | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): the field edge #85837e, the transform of #7b8872 | PASS |
| dark | --neutral-10 | #83807b | derived oklch(0.6002 0.0074 74.99): the re-tune's transform of #79856e (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-11 | #6a5f49 | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): secondary text #6a5f49, the transform of #566652 | PASS |
| dark | --neutral-11 | #d5c0a8 | derived oklch(0.819 0.0405 71.22): the re-tune's transform of #bdc9ad (L kept, chroma × 1.00, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --neutral-12 | #443c16 | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): body text #443c16, the transform of #23442d | PASS |
| dark | --neutral-12 | #efe4da | derived oklch(0.9244 0.0178 65.7): the re-tune's transform of #e4e8db (L kept, chroma × 1.00, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
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
| light | --paper-1 | #fefdfd | derived oklch(0.9959 0.0011 51.49): the re-tune's transform of #fefefa (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| dark | --paper-1 | #131311 | derived oklch(0.1853 0.0034 97.18): the re-tune's transform of #0d150f (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --paper-2 | #fdfbfb | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): the sheet #fdfbfb, the transform of #fdfcf6 | PASS |
| dark | --paper-2 | #191816 | derived oklch(0.2106 0.0038 96.28): the re-tune's transform of #121b14 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --paper-3 | #f6f4f3 | given: the user's palette tuner, saved 2026-10-19 (neutral and paper: chroma × 0.20, hue − 55°; text: chroma × 1.00, hue − 55°; OKLCH, L kept): the canvas #f6f4f3, the transform of #f6f5ed | PASS |
| dark | --paper-3 | #22221f | derived oklch(0.2508 0.0046 94.96): the re-tune's transform of #1a251c (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| light | --paper-4 | #efedec | derived oklch(0.9474 0.0032 44): the re-tune's transform of #f0eee2 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
| dark | --paper-4 | #2b2a27 | derived oklch(0.2854 0.0053 94.06): the re-tune's transform of #212e23 (L kept, chroma × 0.20, hue − 55°; the user's palette tuner, saved 2026-10-1) | PASS |
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
| light | #a2afa4 | sheet #fdfbfb 2.21 | edge #dddbd9 1.65 | informational (the sheet's tonal step) |
| dark | #0e130f | sheet #22221f 1.18 | edge #656360 3.13 | PASS (edge ≥ 3) |

## 23. Public states against the component spec

56 stateful public rules (buttons, the field, chips, the steps; the public CSS has no row class) held to the spec's part in both modes, and their emitted light literal: 56 pass, 0 fail. Linked by the same role 49, by a shared role 7, by value only 0. Planted defects: 2 of 2 caught (the secondary's hover on --kiwi-bg-selected (the re-lock's regression, in the CSS); --kiwi-bg-tint re-pointed at --selection-bg (the same, through the map)).

| Rule | Property | Public name → role | Spec part | Light (public / spec) | Dark (public / spec) | |
|---|---|---|---|---|---|---|
| .kiwi-btn-primary | background-color | `--kiwi-primary` → color.accent-solid | button.primary.state.default.fill | #d0ddbd / #d0ddbd | #354225 / #354225 | PASS |
| .kiwi-btn-primary | color | `--kiwi-primary-contrast` → color.accent-on-solid | button.primary.state.default.text | #23482e / #23482e | #efe4da / #efe4da | PASS |
| .kiwi-btn-primary | border-color | `--kiwi-primary-border` → color.accent-solid-border | button.primary.state.default.border | #577d37 / #577d37 | #859b69 / #859b69 | PASS |
| .kiwi-btn-primary:hover:not(:disabled):not([aria-disabl… | background-color | `--kiwi-primary-hover` → color.accent-solid-hover | button.primary.state.hover.fill | #c7d6b1 / #c7d6b1 | #3f4d2d / #3f4d2d | PASS |
| .kiwi-btn-primary:active:not(:disabled):not([aria-disab… | background-color | `--kiwi-primary-active` → color.accent-solid-active | button.primary.state.active.fill | #bfcea6 / #bfcea6 | #495934 / #495934 | PASS |
| .kiwi-btn:focus-visible | border-color | `--kiwi-border-focus` → color.focus-ring | button.primary.state.focus.border | #577d37 / #577d37 | #b1c698 / #b1c698 | PASS |
| .kiwi-btn:focus-visible | border-color | `--kiwi-border-focus` → color.focus-ring | button.secondary.state.focus.border | #577d37 / #577d37 | #b1c698 / #b1c698 | PASS |
| .kiwi-btn:focus-visible | box-shadow | `--kiwi-border-focus` → color.focus-ring | button.primary.state.focus.ring | #577d37 / #577d37 | #b1c698 / #b1c698 | PASS |
| .kiwi-btn-primary[aria-disabled="true"], .kiwi-btn-prim… | background-color | `--kiwi-primary-disabled` → color.disabled.solid | button.primary.state.disabled.fill | #dce5cc / #dce5cc | #2f3b22 / #2f3b22 | PASS |
| .kiwi-btn-primary[aria-disabled="true"], .kiwi-btn-prim… | border-color | `--kiwi-primary-disabled-border` → color.disabled.solid-border | button.primary.state.disabled.border | #92ae70 / #92ae70 | #495934 / #495934 | PASS |
| .kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled | color | `--kiwi-disabled-label` → color.disabled.label | button.primary.state.disabled.text | #6a5f49 / #6a5f49 | #83807b / #83807b | PASS |
| .kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled | color | `--kiwi-disabled-label` → color.disabled.label | button.secondary.state.disabled.text | #6a5f49 / #6a5f49 | #83807b / #83807b | PASS |
| .kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled | background-color | `--kiwi-bg-paper` → color.surface | button.secondary.state.disabled.fill | #fdfbfb / #fdfbfb | #22221f / #22221f | PASS |
| .kiwi-btn[aria-disabled="true"], .kiwi-btn:disabled | border-color | `--kiwi-disabled-outline` → color.disabled.outline | button.secondary.state.disabled.border | #b1adaa / #b1adaa | #656360 / #656360 | PASS |
| .kiwi-btn-secondary | background-color | `--kiwi-bg-paper` → color.surface | button.secondary.state.default.fill | #fdfbfb / #fdfbfb | #22221f / #22221f | PASS |
| .kiwi-btn-secondary | color | `--kiwi-link` → color.link | button.secondary.state.default.text | #23482e / #23482e | #b9cf9b / #b9cf9b | PASS (a shared role) |
| .kiwi-btn-secondary | border-color | `--kiwi-border-interactive` → color.border-interactive | button.secondary.state.default.border | #85837e / #85837e | #83807b / #83807b | PASS |
| .kiwi-btn-secondary:hover:not(:disabled):not([aria-disa… | background-color | `--kiwi-bg-tint` → color.accent-bg-subtle | button.secondary.state.hover.fill | #eaf0df / #eaf0df | #27321f / #27321f | PASS |
| .kiwi-btn-secondary:active:not(:disabled):not([aria-dis… | background-color | `--kiwi-bg-pressed` → color.accent-bg-subtle-active | button.secondary.state.active.fill | #dce5cc / #dce5cc | #374525 / #374525 | PASS |
| .kiwi-btn-secondary:active:not(:disabled):not([aria-dis… | border-color | `--kiwi-text-primary` → color.text | button.secondary.state.active.border | #443c16 / #443c16 | #efe4da / #efe4da | PASS |
| .kiwi-input | background-color | `--kiwi-bg-paper` → color.surface | field.state.default.fill | #fdfbfb / #fdfbfb | #22221f / #22221f | PASS |
| .kiwi-input | color | `--kiwi-text-primary` → color.text | field.state.default.text | #443c16 / #443c16 | #efe4da / #efe4da | PASS |
| .kiwi-input | border-color | `--kiwi-border-interactive` → color.border-interactive | field.state.default.border | #85837e / #85837e | #83807b / #83807b | PASS |
| .kiwi-input:hover | border-color | `--kiwi-text-primary` → color.text | field.state.hover.border | #443c16 / #443c16 | #efe4da / #efe4da | PASS |
| .kiwi-input:focus-visible | border-color | `--kiwi-border-focus` → color.focus-ring | field.state.focus.border | #577d37 / #577d37 | #b1c698 / #b1c698 | PASS |
| .kiwi-input:focus-visible | box-shadow | `--kiwi-border-focus` → color.focus-ring | field.state.focus.ring | #577d37 / #577d37 | #b1c698 / #b1c698 | PASS |
| .kiwi-input[aria-invalid="true"]:focus-visible | border-color | `--kiwi-error-text` → color.status.error.text | field.state.error.border | #974843 / #974843 | #f49c95 / #f49c95 | PASS |
| .kiwi-input[aria-invalid="true"] | border-color | `--kiwi-error-text` → color.status.error.text | field.state.error.border | #974843 / #974843 | #f49c95 / #f49c95 | PASS |
| .kiwi-input[aria-disabled="true"], .kiwi-input:disabled | background-color | `--kiwi-disabled-surface` → color.disabled.surface | field.state.disabled.fill | #eceae8 / #eceae8 | #33312f / #33312f | PASS |
| .kiwi-input[aria-disabled="true"], .kiwi-input:disabled | color | `--kiwi-disabled-text` → color.disabled.text | field.state.disabled.text | #6a5f49 / #6a5f49 | #d5c0a8 / #d5c0a8 | PASS |
| .kiwi-input[aria-disabled="true"], .kiwi-input:disabled | border-color | `--kiwi-disabled-border` → color.disabled.border | field.state.disabled.border | #dddbd9 / #dddbd9 | #43423f / #43423f | PASS |
| .kiwi-input[aria-busy="true"] | border-color | `--kiwi-border-interactive` → color.border-interactive | field.state.loading.border | #85837e / #85837e | #83807b / #83807b | PASS |
| .kiwi-input[data-state="success"] | border-color | `--kiwi-border-interactive` → color.border-interactive | field.state.success.border | #85837e / #85837e | #83807b / #83807b | PASS |
| .kiwi-chip | background-color | `--kiwi-bg-active` → color.surface-active | chip.role.state.default.fill | #eceae8 / #eceae8 | #33312f / #33312f | PASS |
| .kiwi-chip | color | `--kiwi-text-primary` → color.text | chip.role.state.default.text | #443c16 / #443c16 | #efe4da / #efe4da | PASS |
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

## 24. One frame on focus

112 assertions, 0 failures: every control that has a border shows focus on that border (its focus border and ring are --focus-ring in both modes), the 2 px frame clears 3:1 against the control's fill, its variant fills and the canvas and the sheet, and the public CSS recolours the border of .kiwi-btn and .kiwi-input on focus with no visible outline outside it.

| Control | Mode | Against | Value | Ratio | |
|---|---|---|---|---|---|
| button.primary | light | focus fill | #d0ddbd | 3.36 | PASS |
| button.primary | light | surface | #fdfbfb | 4.64 | PASS |
| button.primary | light | background | #f6f4f3 | 4.36 | PASS |
| button.primary | dark | focus fill | #354225 | 5.82 | PASS |
| button.primary | dark | surface | #22221f | 8.66 | PASS |
| button.primary | dark | background | #191816 | 9.63 | PASS |
| button.secondary | light | focus fill | #fdfbfb | 4.64 | PASS |
| button.secondary | light | surface | #fdfbfb | 4.64 | PASS |
| button.secondary | light | background | #f6f4f3 | 4.36 | PASS |
| button.secondary | dark | focus fill | #22221f | 8.66 | PASS |
| button.secondary | dark | surface | #22221f | 8.66 | PASS |
| button.secondary | dark | background | #191816 | 9.63 | PASS |
| button.destructive | light | focus fill | #fdfbfb | 4.64 | PASS |
| button.destructive | light | surface | #fdfbfb | 4.64 | PASS |
| button.destructive | light | background | #f6f4f3 | 4.36 | PASS |
| button.destructive | dark | focus fill | #22221f | 8.66 | PASS |
| button.destructive | dark | surface | #22221f | 8.66 | PASS |
| button.destructive | dark | background | #191816 | 9.63 | PASS |
| chip.filter | light | focus fill | #fdfbfb | 4.64 | PASS |
| chip.filter | light | variant selected fill | #e4ebd9 | 3.91 | PASS |
| chip.filter | light | surface | #fdfbfb | 4.64 | PASS |
| chip.filter | light | background | #f6f4f3 | 4.36 | PASS |
| chip.filter | dark | focus fill | #22221f | 8.66 | PASS |
| chip.filter | dark | variant selected fill | #2f3b22 | 6.44 | PASS |
| chip.filter | dark | surface | #22221f | 8.66 | PASS |
| chip.filter | dark | background | #191816 | 9.63 | PASS |
| switch | light | surface | #fdfbfb | 4.64 | PASS |
| switch | light | background | #f6f4f3 | 4.36 | PASS |
| switch | dark | surface | #22221f | 8.66 | PASS |
| switch | dark | background | #191816 | 9.63 | PASS |
| field | light | focus fill | #fdfbfb | 4.64 | PASS |
| field | light | variant read-only fill | #f6f4f3 | 4.36 | PASS |
| field | light | surface | #fdfbfb | 4.64 | PASS |
| field | light | background | #f6f4f3 | 4.36 | PASS |
| field | dark | focus fill | #22221f | 8.66 | PASS |
| field | dark | variant read-only fill | #191816 | 9.63 | PASS |
| field | dark | surface | #22221f | 8.66 | PASS |
| field | dark | background | #191816 | 9.63 | PASS |
| checkbox | light | focus fill | #fdfbfb | 4.64 | PASS |
| checkbox | light | variant checked fill | #e4ebd9 | 3.91 | PASS |
| checkbox | light | variant indeterminate fill | #e4ebd9 | 3.91 | PASS |
| checkbox | light | variant radio-checked fill | #e4ebd9 | 3.91 | PASS |
| checkbox | light | surface | #fdfbfb | 4.64 | PASS |
| checkbox | light | background | #f6f4f3 | 4.36 | PASS |
| checkbox | dark | focus fill | #22221f | 8.66 | PASS |
| checkbox | dark | variant checked fill | #2f3b22 | 6.44 | PASS |
| checkbox | dark | variant indeterminate fill | #2f3b22 | 6.44 | PASS |
| checkbox | dark | variant radio-checked fill | #2f3b22 | 6.44 | PASS |
| checkbox | dark | surface | #22221f | 8.66 | PASS |
| checkbox | dark | background | #191816 | 9.63 | PASS |
| panel | light | focus fill | #fdfbfb | 4.64 | PASS |
| panel | light | surface | #fdfbfb | 4.64 | PASS |
| panel | light | background | #f6f4f3 | 4.36 | PASS |
| panel | dark | focus fill | #22221f | 8.66 | PASS |
| panel | dark | surface | #22221f | 8.66 | PASS |
| panel | dark | background | #191816 | 9.63 | PASS |
| dialog | both | focus is on a control inside | a control inside the dialog (the first focusable element, or the title for confirmations) |  | n/a (the sheet's edge never changes) |
| toast | both | focus is on a control inside | the toast's action or Dismiss |  | n/a (the sheet's edge never changes) |
| kpi-tile | light | focus fill | #fdfbfb | 4.64 | PASS |
| kpi-tile | light | surface | #fdfbfb | 4.64 | PASS |
| kpi-tile | light | background | #f6f4f3 | 4.36 | PASS |
| kpi-tile | dark | focus fill | #22221f | 8.66 | PASS |
| kpi-tile | dark | surface | #22221f | 8.66 | PASS |
| kpi-tile | dark | background | #191816 | 9.63 | PASS |
| launcher | light | focus fill | #d0ddbd | 3.36 | PASS |
| launcher | light | variant badge fill | #fdfbfb | 4.64 | PASS |
| launcher | light | surface | #fdfbfb | 4.64 | PASS |
| launcher | light | background | #f6f4f3 | 4.36 | PASS |
| launcher | dark | focus fill | #354225 | 5.82 | PASS |
| launcher | dark | variant badge fill | #22221f | 8.66 | PASS |
| launcher | dark | surface | #22221f | 8.66 | PASS |
| launcher | dark | background | #191816 | 9.63 | PASS |
