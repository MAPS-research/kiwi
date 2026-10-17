# Kiwi UI token checks — 2026-10-17 · source v2.0.0 (sha256 80ce0a0f5b9e) · at cee10e1

Source: `.design-foundations/tokens/kiwi-ui.tokens.json` · Locked block: `kiwi-ui/DESIGN.md` · Result: **PASS**

## 1. Alias equality against the locked block

114 locked declarations compared (both modes), 0 mismatches. The 20 palette.mjs aliases + the 3 lock-named aliases:

| Mode | Locked name | DTCG token | Locked value | DTCG value | |
|---|---|---|---|---|---|
| light | --background | semantic.color.background | #f4f1e4 | #f4f1e4 | PASS |
| light | --surface | semantic.color.surface | #faf9f3 | #faf9f3 | PASS |
| light | --surface-hover | semantic.color.surface-hover | #f1f0ed | #f1f0ed | PASS |
| light | --surface-active | semantic.color.surface-active | #e9e8e4 | #e9e8e4 | PASS |
| light | --border-subtle | semantic.color.border-subtle | #d4d2cb | #d4d2cb | PASS |
| light | --border | semantic.color.border | #c6c3bb | #c6c3bb | PASS |
| light | --border-strong | semantic.color.border-strong | #adaba1 | #adaba1 | PASS |
| light | --text-secondary | semantic.color.text-secondary | #65635c | #65635c | PASS |
| light | --text | semantic.color.text | #2f2e2a | #2f2e2a | PASS |
| light | --accent-bg-subtle | semantic.color.accent-bg-subtle | #e6f5eb | #e6f5eb | PASS |
| light | --accent-solid | semantic.color.accent-solid | #203327 | #203327 | PASS |
| light | --accent-solid-hover | semantic.color.accent-solid-hover | #486d56 | #486d56 | PASS |
| light | --accent-on-solid | semantic.color.accent-on-solid | #fdfdfc | #fdfdfc | PASS |
| light | --accent-text | semantic.color.accent-text | #486d56 | #486d56 | PASS |
| light | --border-interactive | semantic.color.border-interactive | #65635c | #65635c | PASS |
| light | --focus-ring | semantic.color.focus-ring | #486d56 | #486d56 | PASS |
| light | --shadow-ink | semantic.color.shadow-ink | #203327 | #203327 | PASS |
| dark | --background | semantic.color.background | #1b1915 | #1b1915 | PASS |
| dark | --surface | semantic.color.surface | #252218 | #252218 | PASS |
| dark | --surface-hover | semantic.color.surface-hover | #2b2a27 | #2b2a27 | PASS |
| dark | --surface-active | semantic.color.surface-active | #33322e | #33322e | PASS |
| dark | --border-subtle | semantic.color.border-subtle | #3d3c36 | #3d3c36 | PASS |
| dark | --border | semantic.color.border | #4b4942 | #4b4942 | PASS |
| dark | --border-strong | semantic.color.border-strong | #636057 | #636057 | PASS |
| dark | --text-secondary | semantic.color.text-secondary | #b9b7b0 | #b9b7b0 | PASS |
| dark | --text | semantic.color.text | #e9e8e3 | #e9e8e3 | PASS |
| dark | --accent-bg-subtle | semantic.color.accent-bg-subtle | #1a251e | #1a251e | PASS |
| dark | --accent-solid | semantic.color.accent-solid | #84ca9e | #84ca9e | PASS |
| dark | --accent-solid-hover | semantic.color.accent-solid-hover | #9addb2 | #9addb2 | PASS |
| dark | --accent-on-solid | semantic.color.accent-on-solid | #06100a | #06100a | PASS |
| dark | --accent-text | semantic.color.accent-text | #9bc3a8 | #9bc3a8 | PASS |
| dark | --border-interactive | semantic.color.border-interactive | #b9b7b0 | #b9b7b0 | PASS |
| dark | --focus-ring | semantic.color.focus-ring | #84ca9e | #84ca9e | PASS |
| dark | --shadow-ink | semantic.color.shadow-ink | #06100a | #06100a | PASS |

## 2. Structure

20 listed components present: yes; 25 state groups, each with exactly the eight states (200 state specifications); geometry-only groups with no states (one look, the small-popup contract applied): toggletip.

## 3. Per-state contrast (both modes, from the alias values)

Targets: text ≥ 4.5:1, non-text (boundaries, icons, markers, rings) ≥ 3:1. 422 required assertions: 422 pass, 0 fail. 24 informational rows (inactive controls, WCAG 1.4.3/1.4.11 exemption, or decorative hairlines by lock) are reported, not required.

| Component | State | Pair | Kind | Min | Light | Dark | Result |
|---|---|---|---|---|---|---|---|
| button.primary | default | text on fill | text | 4.5 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| button.primary | default | fill on {surface} | non-text | 3 | 12.73 (#203327 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| button.primary | default | fill on {background} | non-text | 3 | 11.86 (#203327 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| button.primary | hover | text on fill | text | 4.5 | 5.74 (#fdfdfc / #486d56) | 12.30 (#06100a / #9addb2) | PASS |
| button.primary | hover | fill on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 10.12 (#9addb2 / #252218) | PASS |
| button.primary | focus | text on fill | text | 4.5 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| button.primary | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| button.primary | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| button.primary | active | text on fill | text | 4.5 | 18.99 (#fdfdfc / #06100a) | 15.93 (#06100a / #d7efdf) | PASS |
| button.primary | disabled | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| button.primary | loading | text on fill | text | 4.5 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| button.primary | error | text on fill | text | 4.5 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| button.primary | success | text on fill | text | 4.5 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| button.primary | success | icon on fill | non-text | 3 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| button.secondary | default | text on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.secondary | default | border on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| button.secondary | default | border on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| button.secondary | hover | text on fill | text | 4.5 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| button.secondary | hover | border on fill | non-text | 3 | 5.33 (#65635c / #e6f5eb) | 7.88 (#b9b7b0 / #1a251e) | PASS |
| button.secondary | focus | text on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.secondary | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| button.secondary | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| button.secondary | active | text on fill | text | 4.5 | 4.80 (#486d56 / #d9eee0) | 7.24 (#9bc3a8 / #1e2f24) | PASS |
| button.secondary | disabled | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| button.secondary | loading | text on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.secondary | error | text on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.secondary | success | text on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.secondary | success | icon on fill | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.tertiary | default | text on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.tertiary | default | text on {background} | text | 4.5 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| button.tertiary | hover | text on fill | text | 4.5 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| button.tertiary | focus | text on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.tertiary | focus | text on {background} | text | 4.5 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| button.tertiary | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| button.tertiary | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| button.tertiary | active | text on fill | text | 4.5 | 4.80 (#486d56 / #d9eee0) | 7.24 (#9bc3a8 / #1e2f24) | PASS |
| button.tertiary | disabled | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | info: clears · inactive control; kept ≥ 4.5 |
| button.tertiary | disabled | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | info: clears · inactive control; kept ≥ 4.5 |
| button.tertiary | loading | text on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.tertiary | loading | text on {background} | text | 4.5 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| button.tertiary | error | text on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.tertiary | error | text on {background} | text | 4.5 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| button.tertiary | success | text on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| button.tertiary | success | text on {background} | text | 4.5 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| button.tertiary.variant.pressed | variant:pressed | text on fill | text | 4.5 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on fill | non-text | 3 | 11.91 (#203327 / #e6f5eb) | 8.23 (#84ca9e / #1a251e) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on {surface} | non-text | 3 | 12.73 (#203327 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| button.tertiary.variant.pressed | variant:pressed | marker on {background} | non-text | 3 | 11.86 (#203327 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| button.destructive | default | text on fill | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| button.destructive | default | border on {surface} | non-text | 3 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| button.destructive | default | border on {background} | non-text | 3 | 5.58 (#974843 / #f4f1e4) | 8.39 (#f49c95 / #1b1915) | PASS |
| button.destructive | hover | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | hover | border on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | focus | text on fill | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| button.destructive | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| button.destructive | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| button.destructive | active | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| button.destructive | disabled | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| button.destructive | loading | text on fill | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| button.destructive | error | text on fill | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| button.destructive | success | text on fill | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| icon-button.variant.selected | variant:selected | icon on fill | non-text | 3 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| icon-button.variant.selected | variant:selected | marker on fill | non-text | 3 | 11.91 (#203327 / #e6f5eb) | 8.23 (#84ca9e / #1a251e) | PASS |
| icon-button.variant.selected | variant:selected | marker on {surface} | non-text | 3 | 12.73 (#203327 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| icon-button.variant.selected | variant:selected | marker on {background} | non-text | 3 | 11.86 (#203327 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| icon-button | default | icon on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| icon-button | default | icon on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| icon-button | hover | icon on fill | non-text | 3 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| icon-button | focus | icon on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| icon-button | focus | icon on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| icon-button | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| icon-button | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| icon-button | active | icon on fill | non-text | 3 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| icon-button | disabled | icon on {surface} | non-text | 3 | 2.18 (#adaba1 / #faf9f3) | 2.53 (#636057 / #252218) | info: below · inactive control; the glyph drops to --border-strong so it reads as disabled; the reason is in the toggletip and helper |
| icon-button | disabled | icon on {background} | non-text | 3 | 2.03 (#adaba1 / #f4f1e4) | 2.79 (#636057 / #1b1915) | info: below · inactive control; the glyph drops to --border-strong so it reads as disabled; the reason is in the toggletip and helper |
| icon-button | loading | icon on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| icon-button | loading | icon on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| icon-button | error | icon on {surface} | non-text | 3 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| icon-button | error | icon on {background} | non-text | 3 | 5.58 (#974843 / #f4f1e4) | 8.39 (#f49c95 / #1b1915) | PASS |
| icon-button | success | icon on {surface} | non-text | 3 | 5.39 (#337437 / #faf9f3) | 8.30 (#88cb8a / #252218) | PASS |
| icon-button | success | icon on {background} | non-text | 3 | 5.02 (#337437 / #f4f1e4) | 9.16 (#88cb8a / #1b1915) | PASS |
| chip.status.variant.error | variant:error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status.variant.error | variant:error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status.variant.success | variant:success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.status.variant.success | variant:success | icon on fill | non-text | 3 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.status.variant.warning | variant:warning | text on fill | text | 4.5 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| chip.status.variant.warning | variant:warning | icon on fill | non-text | 3 | 5.32 (#76602f / #f9f0dd) | 7.93 (#cdb482 / #282113) | PASS |
| chip.status.variant.info | variant:info | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status.variant.info | variant:info | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status.variant.neutral | variant:neutral | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |
| chip.status.variant.neutral | variant:neutral | icon on fill | non-text | 3 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |
| chip.status | default | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | hover | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | focus | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | active | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | disabled | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| chip.status | loading | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |
| chip.status | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| chip.status | success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| chip.filter.variant.selected | variant:selected | text on fill | text | 4.5 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| chip.filter.variant.selected | variant:selected | border on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| chip.filter.variant.selected | variant:selected | border on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| chip.filter | default | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| chip.filter | default | border on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| chip.filter | default | border on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| chip.filter | hover | text on fill | text | 4.5 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| chip.filter | hover | border on fill | non-text | 3 | 5.28 (#65635c / #f1f0ed) | 7.15 (#b9b7b0 / #2b2a27) | PASS |
| chip.filter | focus | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| chip.filter | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| chip.filter | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| chip.filter | active | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| chip.filter | active | border on fill | non-text | 3 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |
| chip.filter | disabled | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| chip.filter | loading | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| chip.filter | error | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| chip.filter | success | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| chip.role | default | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| chip.role | hover | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| chip.role | focus | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| chip.role | active | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| chip.role | disabled | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| chip.role | error | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| chip.role | success | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| switch.variant.on | variant:on | thumb on track | non-text | 3 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| switch.variant.on | variant:on | border on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| switch.variant.on | variant:on | border on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| switch | default | thumb on track | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| switch | default | border on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| switch | default | border on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| switch | hover | thumb on track | non-text | 3 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| switch | focus | thumb on track | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| switch | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| switch | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| switch | active | thumb on track | non-text | 3 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| switch | disabled | thumb on track | non-text | 3 | 1.88 (#adaba1 / #e9e8e4) | 2.04 (#636057 / #33322e) | info: below · inactive control |
| switch | loading | thumb on track | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| switch | loading | border on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| switch | loading | border on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| switch | error | helper on {surface} | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| switch | error | helper on {background} | text | 4.5 | 5.58 (#974843 / #f4f1e4) | 8.39 (#f49c95 / #1b1915) | PASS |
| switch | success | helper on {surface} | text | 4.5 | 5.39 (#337437 / #faf9f3) | 8.30 (#88cb8a / #252218) | PASS |
| switch | success | helper on {background} | text | 4.5 | 5.02 (#337437 / #f4f1e4) | 9.16 (#88cb8a / #1b1915) | PASS |
| field.variant.read-only | variant:read-only | text on fill | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| field | default | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | default | placeholder on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| field | default | border on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| field | default | border on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| field | default | label on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | default | label on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| field | default | helper on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| field | default | helper on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| field | hover | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | hover | border on fill | non-text | 3 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | focus | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| field | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| field | active | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | disabled | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | info: clears · inactive control (WCAG 1.4.3 exemption); kept ≥ 4.5 by measurement |
| field | loading | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | loading | adornment on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| field | error | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | error | border on {surface} | non-text | 3 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| field | error | border on {background} | non-text | 3 | 5.58 (#974843 / #f4f1e4) | 8.39 (#f49c95 / #1b1915) | PASS |
| field | error | helper on {surface} | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| field | error | helper on {background} | text | 4.5 | 5.58 (#974843 / #f4f1e4) | 8.39 (#f49c95 / #1b1915) | PASS |
| field | success | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| field | success | helper on {surface} | text | 4.5 | 5.39 (#337437 / #faf9f3) | 8.30 (#88cb8a / #252218) | PASS |
| field | success | helper on {background} | text | 4.5 | 5.02 (#337437 / #f4f1e4) | 9.16 (#88cb8a / #1b1915) | PASS |
| checkbox.variant.checked | variant:checked | glyph on fill | non-text | 3 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| checkbox.variant.checked | variant:checked | border on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| checkbox.variant.checked | variant:checked | border on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| checkbox.variant.indeterminate | variant:indeterminate | glyph on fill | non-text | 3 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| checkbox.variant.indeterminate | variant:indeterminate | border on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| checkbox.variant.radio-checked | variant:radio-checked | glyph on fill | non-text | 3 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| checkbox.variant.radio-checked | variant:radio-checked | border on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| checkbox | default | border on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| checkbox | default | border on {background} | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| checkbox | default | label on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| checkbox | default | label on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| checkbox | hover | border on {surface} | non-text | 3 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| checkbox | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| checkbox | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| checkbox | active | border on fill | non-text | 3 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| checkbox | disabled | border on fill | non-text | 3 | 1.44 (#c6c3bb / #e9e8e4) | 1.42 (#4b4942 / #33322e) | info: below · inactive control; the reason states why |
| checkbox | disabled | label on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| checkbox | loading | border on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| checkbox | loading | icon on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| checkbox | error | border on {surface} | non-text | 3 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| checkbox | error | helper on {surface} | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| checkbox | error | icon on {surface} | non-text | 3 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| checkbox | success | glyph on fill | non-text | 3 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| checkbox | success | helper on {surface} | text | 4.5 | 5.39 (#337437 / #faf9f3) | 8.30 (#88cb8a / #252218) | PASS |
| tabs.variant.selected | variant:selected | text on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| tabs.variant.selected | variant:selected | text on {background} | text | 4.5 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| tabs.variant.selected | variant:selected | marker on {surface} | non-text | 3 | 12.73 (#203327 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| tabs.variant.selected | variant:selected | marker on {background} | non-text | 3 | 11.86 (#203327 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| tabs | default | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| tabs | default | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| tabs | hover | text on fill | text | 4.5 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| tabs | focus | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| tabs | focus | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| tabs | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| tabs | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| tabs | active | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| tabs | disabled | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| tabs | disabled | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| tabs | disabled | icon on {surface} | non-text | 3 | 2.18 (#adaba1 / #faf9f3) | 2.53 (#636057 / #252218) | info: below · inactive control; the reason states why |
| tabs | loading | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| tabs | loading | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| tabs | error | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| tabs | error | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| tabs | error | icon on {surface} | non-text | 3 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| tabs | error | icon on {background} | non-text | 3 | 5.58 (#974843 / #f4f1e4) | 8.39 (#f49c95 / #1b1915) | PASS |
| tabs | success | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| tabs | success | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| sidebar-item.variant.current | variant:current | text on fill | text | 4.5 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| sidebar-item.variant.current | variant:current | icon on fill | non-text | 3 | 5.18 (#486d56 / #e6f5eb) | 8.11 (#9bc3a8 / #1a251e) | PASS |
| sidebar-item.variant.current | variant:current | marker on fill | non-text | 3 | 11.91 (#203327 / #e6f5eb) | 8.23 (#84ca9e / #1a251e) | PASS |
| sidebar-item | default | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| sidebar-item | default | icon on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| sidebar-item | hover | text on fill | text | 4.5 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| sidebar-item | hover | icon on fill | non-text | 3 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| sidebar-item | focus | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| sidebar-item | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| sidebar-item | active | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| sidebar-item | disabled | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | info: clears · inactive; in practice hidden by permission |
| sidebar-item | error | text on {surface} | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| sidebar-item | success | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| panel | default | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| panel | default | border on {background} | non-text | 3 | 1.56 (#c6c3bb / #f4f1e4) | 1.95 (#4b4942 / #1b1915) | info: below · a panel edge is a hairline; not a control boundary |
| panel | hover | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| panel | focus | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| panel | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| panel | active | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| panel | disabled | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| panel | loading | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| panel | error | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| panel | success | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | default | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | default | title on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | hover | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | focus | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | focus | ring on fill | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| dialog | active | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | disabled | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | loading | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | error | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| dialog | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| dialog | success | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
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
| alert.variant.neutral | variant:neutral | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |
| alert.variant.neutral | variant:neutral | icon on fill | non-text | 3 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |
| alert | default | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | default | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | default | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | hover | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | hover | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | focus | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | focus | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | focus | ring on fill | non-text | 3 | 5.15 (#486d56 / #e3f3ff) | 8.23 (#84ca9e / #17242d) | PASS |
| alert | active | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | active | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | disabled | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| alert | loading | text on fill | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |
| alert | loading | bar on track | non-text | 3 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |
| alert | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert | error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| alert | success | text on fill | text | 4.5 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| alert | success | icon on fill | non-text | 3 | 5.05 (#337437 / #e0f8e0) | 8.22 (#88cb8a / #152715) | PASS |
| toast | default | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| toast | default | action on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| toast | hover | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| toast | hover | action on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| toast | focus | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| toast | focus | action on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| toast | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| toast | active | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| toast | active | action on fill | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| toast | disabled | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| toast | loading | text on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| toast | error | text on fill | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| toast | error | icon on fill | non-text | 3 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| toast | success | text on fill | text | 4.5 | 5.39 (#337437 / #faf9f3) | 8.30 (#88cb8a / #252218) | PASS |
| toast | success | icon on fill | non-text | 3 | 5.39 (#337437 / #faf9f3) | 8.30 (#88cb8a / #252218) | PASS |
| table.variant.selected | variant:selected | text on fill | text | 4.5 | 12.05 (#2f2e2a / #e6f5eb) | 12.90 (#e9e8e3 / #1a251e) | PASS |
| table.variant.selected | variant:selected | marker on fill | non-text | 3 | 11.91 (#203327 / #e6f5eb) | 8.23 (#84ca9e / #1a251e) | PASS |
| table.variant.header | variant:header | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| table.variant.header | variant:header | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| table | default | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| table | default | text on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| table | default | link on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| table | default | link on {background} | text | 4.5 | 5.16 (#486d56 / #f4f1e4) | 9.00 (#9bc3a8 / #1b1915) | PASS |
| table | hover | text on fill | text | 4.5 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| table | hover | secondary on fill | text | 4.5 | 5.28 (#65635c / #f1f0ed) | 7.15 (#b9b7b0 / #2b2a27) | PASS |
| table | focus | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| table | focus | text on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| table | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| table | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| table | active | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| table | disabled | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | info: clears · inactive row; toggletip states why |
| table | disabled | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | info: clears · inactive row; toggletip states why |
| table | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| table | success | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| table | success | text on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| data-grid | default | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| data-grid | default | text on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| data-grid | default | header on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| data-grid | default | header on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| data-grid | hover | text on fill | text | 4.5 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| data-grid | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| data-grid | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| data-grid | active | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| data-grid | disabled | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | info: clears · inactive row |
| data-grid | disabled | text on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | info: clears · inactive row |
| data-grid | error | alert-text on alert | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| data-grid | success | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| data-grid | success | text on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| kpi-tile | default | value on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| kpi-tile | default | label on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| kpi-tile | default | icon on fill | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| kpi-tile | default | trend on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| kpi-tile | hover | value on fill | text | 4.5 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| kpi-tile | hover | label on fill | text | 4.5 | 5.28 (#65635c / #f1f0ed) | 7.15 (#b9b7b0 / #2b2a27) | PASS |
| kpi-tile | focus | value on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| kpi-tile | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| kpi-tile | active | value on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| kpi-tile | disabled | value on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| kpi-tile | loading | label on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| kpi-tile | error | label on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| kpi-tile | error | value on fill | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| kpi-tile | error | icon on fill | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| kpi-tile | error | error-glyph on fill | non-text | 3 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| kpi-tile | success | value on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| empty-state.variant.no-action | variant:no-action | title on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| empty-state.variant.no-action | variant:no-action | title on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| empty-state.variant.no-action | variant:no-action | copy on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| empty-state.variant.no-action | variant:no-action | copy on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| empty-state | default | title on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| empty-state | default | title on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| empty-state | default | copy on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| empty-state | default | copy on {background} | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| empty-state | default | ruler on {surface} | non-text | 3 | 2.18 (#adaba1 / #faf9f3) | 2.53 (#636057 / #252218) | info: below · the ruler is a decorative rule by lock |
| empty-state | default | ruler on {background} | non-text | 3 | 2.03 (#adaba1 / #f4f1e4) | 2.79 (#636057 / #1b1915) | info: below · the ruler is a decorative rule by lock |
| empty-state | hover | title on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| empty-state | hover | title on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| empty-state | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| empty-state | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| empty-state | active | title on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| empty-state | active | title on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| empty-state | disabled | title on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| empty-state | disabled | title on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| empty-state | error | title on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| empty-state | error | title on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| empty-state | error | copy on {surface} | text | 4.5 | 5.99 (#974843 / #faf9f3) | 7.60 (#f49c95 / #252218) | PASS |
| empty-state | error | copy on {background} | text | 4.5 | 5.58 (#974843 / #f4f1e4) | 8.39 (#f49c95 / #1b1915) | PASS |
| empty-state | success | title on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| empty-state | success | title on {background} | text | 4.5 | 12.01 (#2f2e2a / #f4f1e4) | 14.31 (#e9e8e3 / #1b1915) | PASS |
| display-menu | default | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| display-menu | default | group-label on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| display-menu | default | check on fill | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| display-menu | hover | text on fill | text | 4.5 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| display-menu | focus | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| display-menu | focus | ring on fill | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| display-menu | active | text on fill | text | 4.5 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| display-menu | disabled | text on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | info: clears · inactive |
| display-menu | loading | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| display-menu | error | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| display-menu | error | caption on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| display-menu | success | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| display-menu | success | check on fill | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| launcher.variant.badge | variant:badge | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| launcher | default | icon on fill | non-text | 3 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| launcher | default | fill on {surface} | non-text | 3 | 12.73 (#203327 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| launcher | default | fill on {background} | non-text | 3 | 11.86 (#203327 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| launcher | hover | icon on fill | non-text | 3 | 5.74 (#fdfdfc / #486d56) | 12.30 (#06100a / #9addb2) | PASS |
| launcher | hover | fill on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 11.17 (#9addb2 / #1b1915) | PASS |
| launcher | focus | icon on fill | non-text | 3 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| launcher | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| launcher | focus | ring on {background} | non-text | 3 | 5.16 (#486d56 / #f4f1e4) | 9.13 (#84ca9e / #1b1915) | PASS |
| launcher | active | icon on fill | non-text | 3 | 18.99 (#fdfdfc / #06100a) | 15.93 (#06100a / #d7efdf) | PASS |
| launcher | loading | icon on fill | non-text | 3 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| launcher | error | icon on fill | non-text | 3 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| launcher | success | icon on fill | non-text | 3 | 13.19 (#fdfdfc / #203327) | 10.06 (#06100a / #84ca9e) | PASS |
| tutor-message | default | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| tutor-message | default | link on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| tutor-message | default | code on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| tutor-message | default | citation on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| tutor-message | default | toolbar on {surface} | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| tutor-message | hover | toolbar on toolbar-fill | non-text | 3 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| tutor-message | focus | ring on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| tutor-message | active | toolbar on toolbar-fill | non-text | 3 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| tutor-message | disabled | toolbar on {surface} | non-text | 3 | 2.18 (#adaba1 / #faf9f3) | 2.53 (#636057 / #252218) | info: below · inactive control; toggletip "Not available yet" |
| tutor-message | loading | text on {surface} | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| tutor-message | loading | stop on {surface} | text | 4.5 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| tutor-message | error | text on fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| tutor-message | error | icon on fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| tutor-message | success | text on {surface} | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| tutor-message | success | thumb-chosen on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| tutor-message.variant.thumb-chosen | variant:thumb-chosen | glyph on {surface} | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.15 (#9bc3a8 / #252218) | PASS |
| pdf-toolbar.variant.page-current | variant:page-current | outline on canvas | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| pdf-toolbar.variant.pin-visible | variant:pin-visible | fill on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.pin-visible | variant:pin-visible | glyph on fill | non-text | 3 | 13.43 (#ffffff / #203327) | 13.43 (#ffffff / #203327) | PASS |
| pdf-toolbar.variant.pin-hidden | variant:pin-hidden | ring on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.pin-hidden | variant:pin-hidden | glyph on fill | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.chunk | variant:chunk | box on page | non-text | 3 | 6.01 (#65635c / #ffffff) | 6.01 (#65635c / #ffffff) | PASS |
| pdf-toolbar.variant.chunk | variant:chunk | selected on page | non-text | 3 | 13.43 (#203327 / #ffffff) | 13.43 (#203327 / #ffffff) | PASS |
| pdf-toolbar.variant.thumbnails | variant:thumbnails | outline on canvas | non-text | 3 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| pdf-toolbar.variant.thumbnails | variant:thumbnails | label on canvas | text | 4.5 | 5.31 (#65635c / #f4f1e4) | 8.74 (#b9b7b0 / #1b1915) | PASS |
| pdf-toolbar.variant.rail | variant:rail | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| pdf-toolbar.variant.rail | variant:rail | heading on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| pdf-toolbar.variant.search-panel | variant:search-panel | text on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| pdf-toolbar.variant.search-panel | variant:search-panel | status on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| pdf-toolbar.variant.banner | variant:banner | text on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar.variant.banner | variant:banner | icon on fill | non-text | 3 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar.variant.banner | variant:banner | action on fill | text | 4.5 | 5.26 (#3d6886 / #e3f3ff) | 8.00 (#90bedf / #17242d) | PASS |
| pdf-toolbar | default | title on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| pdf-toolbar | default | label on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| pdf-toolbar | default | icon on fill | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| pdf-toolbar | default | field-text on field-fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| pdf-toolbar | default | field-border on fill | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| pdf-toolbar | default | frame on canvas | non-text | 3 | 1.56 (#c6c3bb / #f4f1e4) | 1.95 (#4b4942 / #1b1915) | info: below · the paper's frame is a hairline by lock |
| pdf-toolbar | hover | icon on button-fill | non-text | 3 | 11.93 (#2f2e2a / #f1f0ed) | 11.70 (#e9e8e3 / #2b2a27) | PASS |
| pdf-toolbar | hover | title on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| pdf-toolbar | focus | ring on fill | non-text | 3 | 5.53 (#486d56 / #faf9f3) | 8.27 (#84ca9e / #252218) | PASS |
| pdf-toolbar | focus | icon on fill | non-text | 3 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| pdf-toolbar | active | icon on button-fill | non-text | 3 | 11.09 (#2f2e2a / #e9e8e4) | 10.46 (#e9e8e3 / #33322e) | PASS |
| pdf-toolbar | disabled | icon on fill | non-text | 3 | 2.18 (#adaba1 / #faf9f3) | 2.53 (#636057 / #252218) | info: below · inactive control; the toggletip and helper state why |
| pdf-toolbar | disabled | title on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| pdf-toolbar | loading | label on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| pdf-toolbar | loading | title on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| pdf-toolbar | error | alert-text on alert-fill | text | 4.5 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| pdf-toolbar | error | alert-icon on alert-fill | non-text | 3 | 5.51 (#974843 / #ffebe9) | 7.71 (#f49c95 / #331a18) | PASS |
| pdf-toolbar | error | title on fill | text | 4.5 | 12.89 (#2f2e2a / #faf9f3) | 12.96 (#e9e8e3 / #252218) | PASS |
| pdf-toolbar | success | label on fill | text | 4.5 | 5.70 (#65635c / #faf9f3) | 7.92 (#b9b7b0 / #252218) | PASS |
| pdf-toolbar | success | chip-text on chip | text | 4.5 | 4.90 (#65635c / #e9e8e4) | 6.39 (#b9b7b0 / #33322e) | PASS |

## 4. Per-mode closure of the emitted CSS

:root declares 1295 properties. Dark: 816 depend on a mode token (transitively), 816 are redeclared in [data-theme="dark"], 0 missing. Compact: 96 depend on a density token, 96 redeclared in [data-density="compact"], 0 missing. Root-only composites that embed a mode colour (shadows, backdrop): 0.

## 10. Coarse pointer

34 properties depend on a pointer-varying token; the @media (pointer: coarse) block redeclares 34 on :root and 34 / 34 in the density blocks; 0 missing; --size-target-min consumed: yes.

## 8. Tier rule

923 component-tier references, 0 outside the semantic tier (the rule: component tokens reference semantic tokens only, never a global, never another component).

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

Colour literals outside the global tier: 0 (allowed: the G2 logo black/white, the mode-frozen on-paper marks and a mode-frozen companion.* literal that names its light source (Phase 4: the dark backing); the backdrop and the shadows reference --shadow-ink and carry alphas, composed by the emitter). Banned purple-era hex in the generated CSS, public CSS and MUI preview: 0.

## 6. Public CSS coverage

143 v1 names pinned in the source, 0 unmapped, 0 not emitted; the public file on disk has 143 names, 0 of them not pinned. Mapping: 52 kept, 41 deprecated, 50 repointed, 18 added (161 total).

## 13. Public classes and keyframes

89 v1 class selectors and 3 keyframes pinned; 0 classes and 0 keyframes missing from the generated CSS (98 classes and 4 keyframes emitted); 18 deprecated with a replacement and the 4.0.0 schedule, 0 violations.

## 9. Deprecation schedule

Policy: A deprecated name keeps a safe value and is removed no earlier than two MAJOR versions after the release that deprecated it, and no earlier than six months after that release, whichever is later; the checker asserts the removal major. 41 deprecated names and 18 deprecated classes / keyframes, every one removed in a MAJOR ≥ 4.0.0 (0 violations).

## 14. Selection and pressed cues (a toggle is never colour alone)

12 toggle-like variants must carry a non-colour cue (a 2 px marker, a filled or check glyph, the thumb's position, or weight 600 against 400); marker, glyph and position cues must clear 3:1 against the selected fill and the unselected surfaces in both modes. 20 cue assertions, 0 failures.

| Variant | Cue | Pair | Light | Dark | Result |
|---|---|---|---|---|---|
| icon-button.variant.selected | marker | marker on fill | 11.91 | 8.23 | PASS |
| icon-button.variant.selected | marker | marker on {surface} | 12.73 | 8.27 | PASS |
| icon-button.variant.selected | marker | marker on {background} | 11.86 | 9.13 | PASS |
| button.tertiary.variant.pressed | marker | marker on fill | 11.91 | 8.23 | PASS |
| button.tertiary.variant.pressed | marker | marker on {surface} | 12.73 | 8.27 | PASS |
| button.tertiary.variant.pressed | marker | marker on {background} | 11.86 | 9.13 | PASS |
| tutor-message.variant.thumb-chosen | glyph | glyph on {surface} | 5.53 | 8.15 | PASS |
| chip.filter.variant.selected | weight | 600 vs 400 | — | — | PASS |
| tabs.variant.selected | marker | marker on {surface} | 12.73 | 8.27 | PASS |
| tabs.variant.selected | marker | marker on {background} | 11.86 | 9.13 | PASS |
| sidebar-item.variant.current | marker | marker on fill | 11.91 | 8.23 | PASS |
| sidebar-item.variant.current | marker | marker on {surface} | 12.73 | 8.27 | PASS |
| table.variant.selected | marker | marker on fill | 11.91 | 8.23 | PASS |
| table.variant.selected | marker | marker on {surface} | 12.73 | 8.27 | PASS |
| table.variant.selected | marker | marker on {background} | 11.86 | 9.13 | PASS |
| switch.variant.on | position | thumb on track | 5.18 | 8.11 | PASS |
| checkbox.variant.checked | glyph | glyph on fill | 5.18 | 8.11 | PASS |
| checkbox.variant.indeterminate | glyph | glyph on fill | 5.18 | 8.11 | PASS |
| checkbox.variant.radio-checked | glyph | glyph on fill | 5.18 | 8.11 | PASS |
| display-menu.state.default | glyph | check on fill | 5.53 | 8.15 | PASS |

## 15. Frozen literals

4 literals name their source in $extensions["org.kiwi"].frozen; 0 drifted.

| Token | Literal | Source | Resolved | Result |
|---|---|---|---|---|
| semantic.color.on-paper.pin | #203327 | {global.color.accent.12} (light) | #203327 | PASS |
| semantic.color.on-paper.chunk | #65635c | {global.color.neutral.11} (light) | #65635c | PASS |
| semantic.color.on-paper.wash | #2033271f | {semantic.color.on-paper.pin} (light, α 0.12) | #2033271f | PASS |
| companion.backing (mode.dark) | #faf9f3 | {global.color.paper.2} (light) | #faf9f3 | PASS |

## 16. Interim chart series (until Phase 6)

5 series, 0 below 3:1 on --surface.

| Series | Token | Light | Dark | Result |
|---|---|---|---|---|
| series1 | {global.color.accent.11} | 5.53 | 8.15 | PASS |
| series2 | {global.color.info.11} | 5.65 | 8.04 | PASS |
| series3 | {global.color.warning.11} | 5.71 | 7.91 | PASS |
| series4 | {global.color.neutral.11} | 5.70 | 7.92 | PASS |
| series5 | {global.color.accent.12} | 12.73 | 13.10 | PASS |

## 17. Editor selection

23 assertions, 0 failures: the selection is a visible tint on --editor-bg, differs from the active line, carries a 1 px --editor-selection-outline that clears 3:1 against the surface and the active line, and keeps every syntax colour at 4.5:1.

| Assertion | Light | Dark | Result |
|---|---|---|---|
| selection tint on --editor-bg ≥ 1.1:1 (a visible tint, not 1:1) | 1.15 | 1.47 | PASS |
| selection differs from the active line | #d9eee0 vs #e9e8e4 | #234430 vs #33322e | PASS |
| selection outline on --editor-bg ≥ 3:1 | 12.73 | 8.27 | PASS |
| selection outline on the active line ≥ 3:1 | 10.95 | 6.67 | PASS |
| selection on the active line (tint alone, informational: the outline carries it) | 1.01 | 1.19 | PASS |
| syntax.keyword on the selection ≥ 4.5:1 | 11.17 | 8.82 | PASS |
| syntax.builtin on the selection ≥ 4.5:1 | 11.17 | 8.82 | PASS |
| syntax.type on the selection ≥ 4.5:1 | 11.17 | 8.82 | PASS |
| syntax.class on the selection ≥ 4.5:1 | 11.17 | 8.82 | PASS |
| syntax.function on the selection ≥ 4.5:1 | 11.17 | 8.82 | PASS |
| syntax.variable on the selection ≥ 4.5:1 | 11.17 | 8.82 | PASS |
| syntax.operator on the selection ≥ 4.5:1 | 4.94 | 5.39 | PASS |
| syntax.punctuation on the selection ≥ 4.5:1 | 4.94 | 5.39 | PASS |
| syntax.comment on the selection ≥ 4.5:1 | 4.94 | 5.39 | PASS |
| syntax.string on the selection ≥ 4.5:1 | 4.80 | 5.55 | PASS |
| syntax.number on the selection ≥ 4.5:1 | 4.90 | 5.47 | PASS |
| syntax.constant on the selection ≥ 4.5:1 | 4.90 | 5.47 | PASS |
| syntax.decorator on the selection ≥ 4.5:1 | 4.94 | 5.39 | PASS |
| syntax.error on the selection ≥ 4.5:1 | 5.19 | 5.17 | PASS |
| syntax.warning on the selection ≥ 4.5:1 | 4.95 | 5.38 | PASS |
| the Ace selection rule carries the tint and the outline | {"background":"semantic.editor.selection","ring":"semantic.editor.selection-outline"} | — | PASS |
| ace-kiwi-light.css: the selection rule has the resolved tint and a 1 px outline | .ace-kiwi-light .ace_marker-layer .ace_selection { background-color: #d9eee0; outline: 1px solid #203327; outline-offset | — | PASS |
| ace-kiwi-dark.css: the selection rule has the resolved tint and a 1 px outline | .ace-kiwi-dark .ace_marker-layer .ace_selection { background-color: #234430; outline: 1px solid #84ca9e; outline-offset: | — | PASS |

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

7 required pairs (the forest outline ≥ 3:1 on the dark backing and on the light surfaces behind the transparent light backing), 0 below.

| Mode | Pair | Value | Ratio | |
|---|---|---|---|---|
| dark | outline on companion.backing | #faf9f3 | 10.00 | PASS |
| light | outline on --surface (light backing transparent) | #faf9f3 | 10.00 | PASS |
| light | outline on --background (light backing transparent) | #f4f1e4 | 9.31 | PASS |
| light | outline on --surface-hover (light backing transparent) | #f1f0ed | 9.25 | PASS |
| light | outline on --surface-active (light backing transparent) | #e9e8e4 | 8.60 | PASS |
| light | outline on --accent-bg-subtle (light backing transparent) | #e6f5eb | 9.35 | PASS |
| light | outline on --status-error-surface (light backing transparent) | #ffebe9 | 9.19 | PASS |
| dark | backing disc on --background | #1b1915 | 16.64 | informational |
| dark | backing disc on --surface | #252218 | 15.08 | informational |
| dark | tan bill on companion.backing (not the outline) | #faf9f3 | 1.76 | informational |
