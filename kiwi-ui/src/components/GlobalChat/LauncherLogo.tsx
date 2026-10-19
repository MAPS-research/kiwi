import { useId } from "react";

/**
 * The launcher's face: Kiwi's logo in round form, "step C" (the companion v2
 * decisions of 2026-10-18 and 2026-10-19). The disc replaces the logo's rounded
 * square; the original bird keeps its own paths and colours, scaled ×0.68 about
 * the point where the circle meets its lower left so the neck is cut by the
 * arc; a forest speech bubble sits inside the circle, clear of the edge and the
 * bird. The four fills are the mascot artwork's own palette (#92ae70 sage,
 * #234631 forest, #ccbd99 tan, #f5f4e8 cream), which no token recolours; the
 * edge reads --launcher-border and the state shade reads --kiwi-launcher-shade.
 * Inline, not an <img>, so those custom properties reach it.
 */
const LauncherLogo = () => {
  const clipId = `kiwi-launcher-disc-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 160"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="80" cy="80" r="80" />
        </clipPath>
      </defs>
      <circle cx="80" cy="80" r="80" fill="#92ae70" />
      <circle cx="80" cy="80" r="80" fill="#234631" style={{ fillOpacity: "var(--kiwi-launcher-shade, 0)" }} />
      <g clipPath={`url(#${clipId})`}>
        <g transform="translate(23.431 136.569) scale(0.68) translate(-23.431 -136.569)">
          <path fill="#234631" d="M-12 160V92C4 99 12 83 20 72C33 54 50 47 66 51C87 56 101 74 99 91C98 107 80 118 80 133L82 170Z" />
          <path fill="#234631" d="M25 73C33 51 51 45 68 51C86 56 100 73 99 89C98 108 78 121 58 114C40 108 23 94 25 73Z" />
          <path fill="#ccbd99" d="M97 68L146 56C151 55 153 59 148 62L103 77C98 79 95 73 97 68Z" />
          <circle fill="#f5f4e8" cx="76" cy="78" r="5.5" />
        </g>
      </g>
      <circle
        className="kiwi-launcher-edge"
        cx="80"
        cy="80"
        r="78.571"
        fill="none"
        strokeWidth="2.857"
        style={{ stroke: "var(--kiwi-launcher-edge, var(--launcher-border))" }}
      />
      <path
        fill="#234631"
        d="M82 24H114A12 12 0 0 1 126 36V52A12 12 0 0 1 114 64H92.4L73.36 78.4L80.08 64H82A12 12 0 0 1 70 52V36A12 12 0 0 1 82 24Z"
      />
    </svg>
  );
};

export default LauncherLogo;
