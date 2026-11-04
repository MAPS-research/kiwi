import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { darkModeEnabled, mascotMotionEnabled } from "../config/branding.ts";

/**
 * Display preferences (kiwi-ui/DESIGN.md, The Display menu; the brief's G4).
 *
 * The colour scheme is MUI's own (`useColorScheme`), stored under
 * THEME_MODE_STORAGE_KEY, which index.html also reads before the first paint.
 * This module adds what MUI does not hold: the Kiwi animation switch and the
 * three levels that decide whether Kiwi may move.
 */

/** localStorage key of the colour scheme; index.html reads the same key before React mounts. */
export const THEME_MODE_STORAGE_KEY = "kiwi-theme-mode";
/** localStorage key of the Kiwi animation switch ("on" or "off"; on by default). */
export const KIWI_ANIMATION_STORAGE_KEY = "kiwi-animation";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export interface DisplayPreferences {
  /** Whether this deployment offers the Theme group (VITE_ENABLE_DARK_MODE). */
  themeChoice: boolean;
  /** Whether this deployment lets Kiwi move at all (VITE_ENABLE_MASCOT_MOTION). */
  animationChoice: boolean;
  /** The Display menu's Kiwi animation switch: level 3, on unless the user turned it off. */
  animation: boolean;
  setAnimation: (on: boolean) => void;
  /** The device asks for reduced motion: level 2, which the switch cannot override. */
  reducedMotion: boolean;
  /** False when the browser refused to store a choice; it then lasts for this page only. */
  saved: boolean;
  /** Kiwi may move: every level allows it (deployment, then device, then switch). */
  motionAllowed: boolean;
}

function readAnimation(): { on: boolean; readable: boolean } {
  try {
    return { on: window.localStorage.getItem(KIWI_ANIMATION_STORAGE_KEY) !== "off", readable: true };
  } catch {
    // Storage is blocked (private mode, a policy): the default applies.
    return { on: true, readable: false };
  }
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

const DisplayPreferencesContext = createContext<DisplayPreferences | null>(null);

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readAnimation);
  const [animation, setAnimationState] = useState(initial.on);
  const [saved, setSaved] = useState(initial.readable);
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  const setAnimation = useCallback((on: boolean) => {
    setAnimationState(on);
    try {
      window.localStorage.setItem(KIWI_ANIMATION_STORAGE_KEY, on ? "on" : "off");
      setSaved(true);
    } catch {
      // The choice still applies, for this page only; the menu says so.
      setSaved(false);
    }
  }, []);

  const value = useMemo<DisplayPreferences>(() => {
    const animationChoice = mascotMotionEnabled();
    return {
      themeChoice: darkModeEnabled(),
      animationChoice,
      animation,
      setAnimation,
      reducedMotion,
      saved,
      motionAllowed: animationChoice && !reducedMotion && animation,
    };
  }, [animation, setAnimation, reducedMotion, saved]);

  return <DisplayPreferencesContext.Provider value={value}>{children}</DisplayPreferencesContext.Provider>;
}

/**
 * The current preferences. Outside a provider (an isolated component test, a story)
 * it answers with the defaults: the deployment's switches, the device's motion
 * setting and the animation switch on.
 */
export function useDisplayPreferences(): DisplayPreferences {
  const context = useContext(DisplayPreferencesContext);
  if (context) return context;
  const animationChoice = mascotMotionEnabled();
  const reducedMotion = prefersReducedMotion();
  return {
    themeChoice: darkModeEnabled(),
    animationChoice,
    animation: true,
    setAnimation: () => undefined,
    reducedMotion,
    saved: true,
    motionAllowed: animationChoice && !reducedMotion,
  };
}
