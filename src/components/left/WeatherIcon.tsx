import { WeatherCondition } from "../../lib/weatherCodes";
import { useDecor } from "../../hooks/useTheme";
import { JackOLanternShape } from "../theme/JackOLantern";
import { WitchOnBroomShape } from "../theme/art/WitchOnBroom";
import { BichonFriseShape } from "../theme/art/BichonFrise";
import { KittyHeadShape } from "../theme/art/KittyHead";
import { SantaHatShape } from "../theme/art/SantaHat";

interface WeatherIconProps {
  condition: WeatherCondition;
  size?: number;
  className?: string;
}

export function WeatherIcon({ condition, size = 80, className = "" }: WeatherIconProps) {
  const decor = useDecor();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {renderCondition(condition, decor)}
    </svg>
  );
}

/**
 * Decor presets override only the sun and cloud conditions; rain, snow, fog and
 * storms keep their standard artwork so the forecast stays readable at a glance.
 */
function renderCondition(condition: WeatherCondition, decor: string) {
  if (decor === "halloween") {
    if (condition === "clear") return <PumpkinIcon />;
    if (condition === "partly-cloudy" || condition === "cloudy") return <WitchIcon />;
  }
  if (decor === "gingey") {
    if (condition === "clear") return <KittySunIcon />;
    if (condition === "partly-cloudy" || condition === "cloudy") return <BichonIcon />;
  }
  if (decor === "thanksgiving" || decor === "christmas") {
    // The Santa bichon stands in for the sun and for every cloud it can
    // replace without losing the forecast: partly cloudy keeps its sun, and the
    // rain and storm icons keep their drops and lightning underneath.
    if (condition === "clear") return <SantaBichonIcon />;
    if (condition === "partly-cloudy") return <PartlyCloudyIcon santa />;
    if (condition === "drizzle") return <DrizzleIcon santa />;
    if (condition === "rain") return <RainIcon santa />;
    if (condition === "heavy-rain") return <HeavyRainIcon santa />;
    if (condition === "thunderstorm") return <ThunderstormIcon santa />;
    if (condition === "cloudy") return <SantaCloudyIcon />;
    if (condition === "foggy") return <FogIcon santa />;
  }

  switch (condition) {
    case "clear":
      return <SunIcon />;
    case "partly-cloudy":
      return <PartlyCloudyIcon />;
    case "cloudy":
      return <CloudIcon />;
    case "foggy":
      return <FogIcon />;
    case "drizzle":
      return <DrizzleIcon />;
    case "rain":
      return <RainIcon />;
    case "heavy-rain":
      return <HeavyRainIcon />;
    case "snow":
      return <SnowIcon />;
    case "thunderstorm":
      return <ThunderstormIcon />;
    default:
      return <CloudIcon />;
  }
}

function WitchIcon() {
  return (
    <g>
      <style>{`
        @keyframes witch-fly { 0%,100%{transform:translate(0,0)} 50%{transform:translate(2px,-2.5px)} }
        @keyframes coven-glow { 0%,100%{opacity:1} 50%{opacity:0.72} }
        .witch-rider { animation: witch-fly 4.5s ease-in-out infinite; }
        .witch-glow { animation: coven-glow 3s ease-in-out infinite; }
      `}</style>
      <g className="witch-glow">
        <WitchOnBroomShape />
      </g>
    </g>
  );
}

function KittySunIcon({ color = "#a855f7" }: { color?: string }) {
  return (
    <g>
      <style>{`
        @keyframes kitty-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes kitty-pulse { 0%,100% { opacity:1; } 50% { opacity:0.78; } }
        .kitty-rays { animation: kitty-spin 12s linear infinite; transform-origin: 40px 40px; }
        /* No transform-origin here: it would also re-anchor the transform
           attribute on this group, shifting the scaled head off the ray ring.
           The pulse only animates opacity, so it does not need one. */
        .kitty-core { animation: kitty-pulse 3s ease-in-out infinite; }
      `}</style>
      <g className="kitty-rays">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <line
            key={i}
            x1="40" y1="8" x2="40" y2="16"
            stroke={color} strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${angle} 40 40)`}
          />
        ))}
      </g>
      {/* 64-grid head scaled to sit inside the ray ring, centred on its face
          rather than the viewBox (the ears sit above centre) */}
      <g className="kitty-core" transform="translate(40 40) scale(0.6) translate(-32 -34)">
        <KittyHeadShape color={color} />
      </g>
    </g>
  );
}

function BichonIcon() {
  return (
    <g>
      <style>{`
        @keyframes bichon-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        .bichon { animation: bichon-bob 4s ease-in-out infinite; transform-origin: 40px 40px; }
      `}</style>
      <g className="bichon" transform="translate(8 8)">
        <BichonFriseShape />
      </g>
    </g>
  );
}

/** The Gingey bichon in a Santa hat, standing in for the sun. */
function SantaBichonIcon() {
  return (
    <g>
      <style>{`
        @keyframes santa-bichon-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        @keyframes santa-sun-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .santa-bichon { animation: santa-bichon-bob 4s ease-in-out infinite; }
        .santa-sun-rays { animation: santa-sun-spin 12s linear infinite; transform-origin: 40px 44px; }
      `}</style>
      {/* Rays behind the head, centred on the face. The origin is safe here:
          this <g> rotates and has no transform attribute of its own. */}
      <g className="santa-sun-rays">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
          <line
            key={angle}
            x1="40" y1="10" x2="40" y2="19"
            stroke="#FFD700" strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${angle} 40 44)`}
          />
        ))}
      </g>
      {/* Scaled down from full size so the rays fit around it inside the
          viewBox. The bob lives on an outer <g>: the inner one's transform
          attribute would be overridden by the animated CSS transform otherwise. */}
      <g className="santa-bichon">
        <SantaBichon transform="translate(17 18) scale(0.72)" />
      </g>
    </g>
  );
}

/**
 * Bichon plus hat on the 64-unit grid; spans roughly x 3-62, y -10-58 there,
 * since the hat rises above the head. Callers place and scale it with a
 * transform, and must animate an outer <g> rather than this one - a CSS
 * animation's transform replaces the transform attribute on the same element.
 */
function SantaBichon({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <BichonFriseShape />
      <SantaHatShape />
    </g>
  );
}

/**
 * Overcast: two bichons where the cloud bank would be - a smaller one behind,
 * a larger one in front - bobbing out of step like drifting clouds.
 */
function SantaCloudyIcon() {
  return (
    <g>
      <style>{`
        @keyframes santa-cloud-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        .santa-cloud-back { animation: santa-cloud-bob 5s ease-in-out infinite; }
        .santa-cloud-front { animation: santa-cloud-bob 5s ease-in-out -2.5s infinite; }
      `}</style>
      <g className="santa-cloud-back">
        <SantaBichon transform="translate(6 12) scale(0.5)" />
      </g>
      <g className="santa-cloud-front">
        <SantaBichon transform="translate(26 30) scale(0.6)" />
      </g>
    </g>
  );
}

/** Where a small Santa bichon sits in place of the rain cloud (y ~1-43). */
const RAIN_CLOUD_BICHON = "translate(20 7) scale(0.62)";

function PumpkinIcon() {
  return (
    <g>
      <style>{`
        @keyframes pumpkin-glow { 0%,100% { opacity:1; } 50% { opacity:0.82; } }
        .pumpkin-core { animation: pumpkin-glow 3s ease-in-out infinite; transform-origin: 40px 40px; }
      `}</style>
      {/* 64-unit pumpkin centred in this 80-unit viewBox */}
      <g className="pumpkin-core" transform="translate(8 8)">
        <JackOLanternShape />
      </g>
    </g>
  );
}

function SunIcon() {
  return (
    <g>
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-sun { 0%,100% { opacity:1; } 50% { opacity:0.7; } }
        .sun-rays { animation: spin-slow 12s linear infinite; transform-origin: 40px 40px; }
        .sun-core { animation: pulse-sun 3s ease-in-out infinite; transform-origin: 40px 40px; }
      `}</style>
      <g className="sun-rays">
        {[0,45,90,135,180,225,270,315].map((angle, i) => (
          <line
            key={i}
            x1="40" y1="8" x2="40" y2="16"
            stroke="#FFD700" strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${angle} 40 40)`}
          />
        ))}
      </g>
      <circle className="sun-core" cx="40" cy="40" r="16" fill="#FFD700" />
    </g>
  );
}

function PartlyCloudyIcon({ santa = false }: { santa?: boolean }) {
  return (
    <g>
      <style>{`
        @keyframes sun-peek { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-3px)} }
        @keyframes cloud-drift { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
        .pc-sun { animation: sun-peek 4s ease-in-out infinite; }
        .pc-cloud { animation: cloud-drift 4s ease-in-out infinite; }
      `}</style>
      <g className="pc-sun">
        <circle cx="30" cy="30" r="14" fill="#FFD700" />
        {[0,60,120,180,240,300].map((angle, i) => (
          <line key={i} x1="30" y1="10" x2="30" y2="16"
            stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round"
            transform={`rotate(${angle} 30 30)`} />
        ))}
      </g>
      <g className="pc-cloud">
        {santa ? (
          // Lower right, where the cloud sits, so the sun still peeks out.
          <SantaBichon transform="translate(27 34) scale(0.6)" />
        ) : (
          <>
            <ellipse cx="44" cy="48" rx="18" ry="12" fill="white" opacity="0.95" />
            <circle cx="32" cy="48" r="10" fill="white" opacity="0.95" />
            <circle cx="50" cy="44" r="12" fill="white" opacity="0.95" />
            <rect x="24" y="48" width="38" height="12" fill="white" opacity="0.95" />
          </>
        )}
      </g>
    </g>
  );
}

function CloudIcon() {
  return (
    <g>
      <style>{`
        @keyframes cloud-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .cloud-main { animation: cloud-bob 5s ease-in-out infinite; }
      `}</style>
      <g className="cloud-main">
        <ellipse cx="40" cy="46" rx="22" ry="14" fill="white" opacity="0.9" />
        <circle cx="26" cy="46" r="12" fill="white" opacity="0.9" />
        <circle cx="46" cy="40" r="16" fill="white" opacity="0.9" />
        <circle cx="58" cy="46" r="10" fill="white" opacity="0.9" />
        <rect x="14" y="46" width="52" height="14" fill="white" opacity="0.9" />
      </g>
    </g>
  );
}

function FogIcon({ santa = false }: { santa?: boolean }) {
  return (
    <g>
      <style>{`
        @keyframes fog-drift { 0%{opacity:0.4;transform:translateX(-4px)} 50%{opacity:0.9;transform:translateX(4px)} 100%{opacity:0.4;transform:translateX(-4px)} }
        .fog-line { animation: fog-drift var(--d,4s) ease-in-out infinite; }
      `}</style>
      {/* Behind the fog, and half transparent: the fog lines are white too,
          and would vanish against a solid white coat. */}
      {santa && (
        <g opacity="0.5">
          <SantaBichon transform="translate(14 14) scale(0.8)" />
        </g>
      )}
      {[24, 34, 44, 54].map((y, i) => (
        <rect key={i} className="fog-line" x="10" y={y} width={50 - (i % 2) * 10} height="5"
          rx="2.5" fill="white" opacity="0.6" style={{ "--d": `${3 + i * 0.7}s` } as React.CSSProperties} />
      ))}
    </g>
  );
}

function DrizzleIcon({ santa = false }: { santa?: boolean }) {
  return (
    <g>
      <style>{`
        @keyframes drizzle-fall { 0%{transform:translateY(-10px);opacity:0} 80%{opacity:1} 100%{transform:translateY(15px);opacity:0} }
        .drop { animation: drizzle-fall 1.5s ease-in infinite; }
      `}</style>
      {santa ? (
        <SantaBichon transform={RAIN_CLOUD_BICHON} />
      ) : (
        <>
          <ellipse cx="40" cy="30" rx="22" ry="14" fill="white" opacity="0.85" />
          <circle cx="24" cy="30" r="12" fill="white" opacity="0.85" />
          <circle cx="46" cy="24" r="15" fill="white" opacity="0.85" />
          <rect x="12" y="30" width="54" height="12" fill="white" opacity="0.85" />
        </>
      )}
      {[24, 34, 44, 54].map((x, i) => (
        <line key={i} className="drop" x1={x} y1="48" x2={x - 3} y2="58"
          stroke="#90CAF9" strokeWidth="2.5" strokeLinecap="round"
          style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </g>
  );
}

function RainIcon({ santa = false }: { santa?: boolean }) {
  return (
    <g>
      <style>{`
        @keyframes rain-fall { 0%{transform:translateY(-10px);opacity:0} 70%{opacity:1} 100%{transform:translateY(18px);opacity:0} }
        .raindrop { animation: rain-fall 1s ease-in infinite; }
      `}</style>
      {santa ? (
        <SantaBichon transform={RAIN_CLOUD_BICHON} />
      ) : (
        <>
          <ellipse cx="40" cy="28" rx="22" ry="13" fill="#B0BEC5" opacity="0.9" />
          <circle cx="24" cy="28" r="11" fill="#B0BEC5" opacity="0.9" />
          <circle cx="46" cy="22" r="14" fill="#B0BEC5" opacity="0.9" />
          <rect x="12" y="28" width="54" height="11" fill="#B0BEC5" opacity="0.9" />
        </>
      )}
      {[22, 32, 42, 52, 62].map((x, i) => (
        <line key={i} className="raindrop" x1={x} y1="46" x2={x - 4} y2="60"
          stroke="#42A5F5" strokeWidth="2.5" strokeLinecap="round"
          style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </g>
  );
}

function HeavyRainIcon({ santa = false }: { santa?: boolean }) {
  return (
    <g>
      <style>{`
        @keyframes heavy-rain { 0%{transform:translateY(-8px);opacity:0} 60%{opacity:1} 100%{transform:translateY(20px);opacity:0} }
        .hraindrop { animation: heavy-rain 0.7s ease-in infinite; }
      `}</style>
      {santa ? (
        <SantaBichon transform={RAIN_CLOUD_BICHON} />
      ) : (
        <>
          <ellipse cx="40" cy="26" rx="22" ry="13" fill="#78909C" opacity="0.95" />
          <circle cx="24" cy="26" r="11" fill="#78909C" opacity="0.95" />
          <circle cx="46" cy="20" r="14" fill="#78909C" opacity="0.95" />
          <rect x="12" y="26" width="54" height="11" fill="#78909C" opacity="0.95" />
        </>
      )}
      {[18, 26, 34, 42, 50, 58, 66].map((x, i) => (
        <line key={i} className="hraindrop" x1={x} y1="44" x2={x - 5} y2="62"
          stroke="#1E88E5" strokeWidth="2.5" strokeLinecap="round"
          style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </g>
  );
}

function SnowIcon() {
  return (
    <g>
      <style>{`
        @keyframes snow-fall { 0%{transform:translateY(-10px) rotate(0deg);opacity:0} 70%{opacity:1} 100%{transform:translateY(18px) rotate(180deg);opacity:0} }
        .snowflake { animation: snow-fall 2s ease-in infinite; }
      `}</style>
      <ellipse cx="40" cy="28" rx="22" ry="13" fill="#E3F2FD" opacity="0.9" />
      <circle cx="24" cy="28" r="11" fill="#E3F2FD" opacity="0.9" />
      <circle cx="46" cy="22" r="14" fill="#E3F2FD" opacity="0.9" />
      <rect x="12" y="28" width="54" height="11" fill="#E3F2FD" opacity="0.9" />
      {[24, 36, 48, 60].map((x, i) => (
        <text key={i} className="snowflake" x={x} y="52" fill="#90CAF9"
          fontSize="12" textAnchor="middle"
          style={{ animationDelay: `${i * 0.4}s` }}>❄</text>
      ))}
    </g>
  );
}

function ThunderstormIcon({ santa = false }: { santa?: boolean }) {
  return (
    <g>
      <style>{`
        @keyframes lightning-flash { 0%,90%,100%{opacity:1} 92%{opacity:0.1} 96%{opacity:0.1} 94%,98%{opacity:1} }
        @keyframes storm-rain { 0%{transform:translateY(-8px);opacity:0} 70%{opacity:1} 100%{transform:translateY(16px);opacity:0} }
        .storm-cloud { animation: lightning-flash 3s ease-in-out infinite; }
        .storm-drop { animation: storm-rain 0.8s ease-in infinite; }
      `}</style>
      {/* The flash is opacity-only, so it can wrap the bichon's own transform. */}
      <g className="storm-cloud">
        {santa ? (
          <SantaBichon transform={RAIN_CLOUD_BICHON} />
        ) : (
          <>
            <ellipse cx="40" cy="26" rx="22" ry="13" fill="#546E7A" opacity="0.95" />
            <circle cx="24" cy="26" r="11" fill="#546E7A" opacity="0.95" />
            <circle cx="46" cy="20" r="14" fill="#546E7A" opacity="0.95" />
            <rect x="12" y="26" width="54" height="11" fill="#546E7A" opacity="0.95" />
          </>
        )}
      </g>
      <polygon points="38,40 32,56 39,52 34,68 48,48 40,52 44,40" fill="#FFD600" opacity="0.95" />
      {[20, 58].map((x, i) => (
        <line key={i} className="storm-drop" x1={x} y1="42" x2={x - 4} y2="56"
          stroke="#42A5F5" strokeWidth="2" strokeLinecap="round"
          style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
    </g>
  );
}
