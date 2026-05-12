import type { SVGProps } from 'react';

type LogoProps = SVGProps<SVGSVGElement> & {
  iconClassName?: string;
  wordmarkClassName?: string;
};

export function LogoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 260"
      aria-label="Logotipo PhiDocs"
      role="img"
      {...props}
    >
      <defs>
        <linearGradient id="phidocsIconHelmet" x1="48" x2="212" y1="28" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff4f00" />
          <stop offset="0.56" stopColor="#ff7f08" />
          <stop offset="1" stopColor="#f25a00" />
        </linearGradient>
      </defs>

      <g>
        <path
          d="M34 144c0-55 39-94 96-94 57 0 96 39 96 94 0 55-39 94-96 94-57 0-96-39-96-94Zm39 0c0 34 22 57 57 57s57-23 57-57-22-57-57-57-57 23-57 57Z"
          fill="#061f36"
          fillRule="evenodd"
        />
        <path d="M112 74h37v158h43v31h-80V74Z" fill="#061f36" />
        <path d="M90 78h22v123H90V78Z" fill="#ffffff" />
        <path d="M149 78h22v123h-22V78Z" fill="#ffffff" />

        <path
          d="M44 114c9-57 44-89 86-89s78 32 87 89H44Z"
          fill="url(#phidocsIconHelmet)"
        />
        <path d="M54 107h153c13 0 23 8 23 18v5H30v-5c0-10 11-18 24-18Z" fill="#ff7a08" />
        <path d="M32 125h196v12H32z" fill="#f45d05" />
        <path
          d="M90 45c12-11 26-17 40-18l-4 78H76c2-25 6-45 14-60Zm84-1c15 11 25 32 31 61h-51l-4-78c8 1 16 7 24 17Z"
          fill="#ff6a00"
        />
        <path d="M107 33c7-4 15-6 23-6 9 0 17 2 24 6l-5 72h-37l-5-72Z" fill="#ff8b18" />
        <path
          d="M180 52c12 12 20 26 23 43"
          fill="none"
          stroke="#ffbd68"
          strokeLinecap="round"
          strokeWidth="7"
          opacity="0.75"
        />
      </g>
    </svg>
  );
}

export function LogoWordmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 735 170"
      aria-label="PhiDocs"
      role="img"
      {...props}
    >
      <defs>
        <linearGradient id="phidocsWordmarkOrange" x1="270" x2="735" y1="18" y2="142" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff7800" />
          <stop offset="1" stopColor="#f35a00" />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="134"
        fill="#061f36"
        fontFamily="Hanken Grotesk, Inter, Arial, sans-serif"
        fontSize="166"
        fontWeight="800"
        letterSpacing="0"
      >
        Phi
      </text>
      <text
        x="270"
        y="134"
        fill="url(#phidocsWordmarkOrange)"
        fontFamily="Hanken Grotesk, Inter, Arial, sans-serif"
        fontSize="166"
        fontWeight="800"
        letterSpacing="0"
      >
        Docs
      </text>
    </svg>
  );
}

export function Logo({ iconClassName, wordmarkClassName, className, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1165 355"
      aria-label="PhiDocs"
      role="img"
      className={className}
      {...props}
    >
      <LogoIcon x="84" y="48" width="252" height="252" className={iconClassName} />
      <LogoWordmark x="430" y="92" width="735" height="170" className={wordmarkClassName} />
    </svg>
  );
}
