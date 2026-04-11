import { WeatherCondition } from "../../lib/weatherCodes";

interface WeatherIconProps {
  condition: WeatherCondition;
  size?: number;
  className?: string;
}

export function WeatherIcon({ condition, size = 80, className = "" }: WeatherIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {condition === "clear" && <SunIcon />}
      {condition === "partly-cloudy" && <PartlyCloudyIcon />}
      {condition === "cloudy" && <CloudIcon />}
      {condition === "foggy" && <FogIcon />}
      {condition === "drizzle" && <DrizzleIcon />}
      {condition === "rain" && <RainIcon />}
      {condition === "heavy-rain" && <HeavyRainIcon />}
      {condition === "snow" && <SnowIcon />}
      {condition === "thunderstorm" && <ThunderstormIcon />}
    </svg>
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

function PartlyCloudyIcon() {
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
        <ellipse cx="44" cy="48" rx="18" ry="12" fill="white" opacity="0.95" />
        <circle cx="32" cy="48" r="10" fill="white" opacity="0.95" />
        <circle cx="50" cy="44" r="12" fill="white" opacity="0.95" />
        <rect x="24" y="48" width="38" height="12" fill="white" opacity="0.95" />
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

function FogIcon() {
  return (
    <g>
      <style>{`
        @keyframes fog-drift { 0%{opacity:0.4;transform:translateX(-4px)} 50%{opacity:0.9;transform:translateX(4px)} 100%{opacity:0.4;transform:translateX(-4px)} }
        .fog-line { animation: fog-drift var(--d,4s) ease-in-out infinite; }
      `}</style>
      {[24, 34, 44, 54].map((y, i) => (
        <rect key={i} className="fog-line" x="10" y={y} width={50 - (i % 2) * 10} height="5"
          rx="2.5" fill="white" opacity="0.6" style={{ "--d": `${3 + i * 0.7}s` } as React.CSSProperties} />
      ))}
    </g>
  );
}

function DrizzleIcon() {
  return (
    <g>
      <style>{`
        @keyframes drizzle-fall { 0%{transform:translateY(-10px);opacity:0} 80%{opacity:1} 100%{transform:translateY(15px);opacity:0} }
        .drop { animation: drizzle-fall 1.5s ease-in infinite; }
      `}</style>
      <ellipse cx="40" cy="30" rx="22" ry="14" fill="white" opacity="0.85" />
      <circle cx="24" cy="30" r="12" fill="white" opacity="0.85" />
      <circle cx="46" cy="24" r="15" fill="white" opacity="0.85" />
      <rect x="12" y="30" width="54" height="12" fill="white" opacity="0.85" />
      {[24, 34, 44, 54].map((x, i) => (
        <line key={i} className="drop" x1={x} y1="48" x2={x - 3} y2="58"
          stroke="#90CAF9" strokeWidth="2.5" strokeLinecap="round"
          style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </g>
  );
}

function RainIcon() {
  return (
    <g>
      <style>{`
        @keyframes rain-fall { 0%{transform:translateY(-10px);opacity:0} 70%{opacity:1} 100%{transform:translateY(18px);opacity:0} }
        .raindrop { animation: rain-fall 1s ease-in infinite; }
      `}</style>
      <ellipse cx="40" cy="28" rx="22" ry="13" fill="#B0BEC5" opacity="0.9" />
      <circle cx="24" cy="28" r="11" fill="#B0BEC5" opacity="0.9" />
      <circle cx="46" cy="22" r="14" fill="#B0BEC5" opacity="0.9" />
      <rect x="12" y="28" width="54" height="11" fill="#B0BEC5" opacity="0.9" />
      {[22, 32, 42, 52, 62].map((x, i) => (
        <line key={i} className="raindrop" x1={x} y1="46" x2={x - 4} y2="60"
          stroke="#42A5F5" strokeWidth="2.5" strokeLinecap="round"
          style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </g>
  );
}

function HeavyRainIcon() {
  return (
    <g>
      <style>{`
        @keyframes heavy-rain { 0%{transform:translateY(-8px);opacity:0} 60%{opacity:1} 100%{transform:translateY(20px);opacity:0} }
        .hraindrop { animation: heavy-rain 0.7s ease-in infinite; }
      `}</style>
      <ellipse cx="40" cy="26" rx="22" ry="13" fill="#78909C" opacity="0.95" />
      <circle cx="24" cy="26" r="11" fill="#78909C" opacity="0.95" />
      <circle cx="46" cy="20" r="14" fill="#78909C" opacity="0.95" />
      <rect x="12" y="26" width="54" height="11" fill="#78909C" opacity="0.95" />
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

function ThunderstormIcon() {
  return (
    <g>
      <style>{`
        @keyframes lightning-flash { 0%,90%,100%{opacity:1} 92%{opacity:0.1} 96%{opacity:0.1} 94%,98%{opacity:1} }
        @keyframes storm-rain { 0%{transform:translateY(-8px);opacity:0} 70%{opacity:1} 100%{transform:translateY(16px);opacity:0} }
        .storm-cloud { animation: lightning-flash 3s ease-in-out infinite; }
        .storm-drop { animation: storm-rain 0.8s ease-in infinite; }
      `}</style>
      <g className="storm-cloud">
        <ellipse cx="40" cy="26" rx="22" ry="13" fill="#546E7A" opacity="0.95" />
        <circle cx="24" cy="26" r="11" fill="#546E7A" opacity="0.95" />
        <circle cx="46" cy="20" r="14" fill="#546E7A" opacity="0.95" />
        <rect x="12" y="26" width="54" height="11" fill="#546E7A" opacity="0.95" />
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
