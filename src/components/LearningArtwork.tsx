import { useId } from 'react';

/** Decorative vector illustration; all labels are separate HTML text. */
export function LearningArtwork() {
    const id = useId().replace(/:/g, '');
    const paper = `${id}-paper`, gold = `${id}-gold`, glow = `${id}-glow`, light = `${id}-light`;
    return (
        <svg className="elite-learning-art" viewBox="0 0 480 310" fill="none" aria-hidden="true" focusable="false">
            <defs>
                <linearGradient id={paper} x1="200" y1="130" x2="240" y2="290" gradientUnits="userSpaceOnUse"><stop stopColor="#fff3d8" /><stop offset="1" stopColor="#d4b476" /></linearGradient>
                <linearGradient id={gold} x1="340" y1="30" x2="425" y2="245" gradientUnits="userSpaceOnUse"><stop stopColor="#f6d58f" /><stop offset="1" stopColor="#9c7134" /></linearGradient>
                <radialGradient id={glow}><stop stopColor="#e7be70" stopOpacity=".28" /><stop offset="1" stopColor="#e7be70" stopOpacity="0" /></radialGradient>
                <linearGradient id={light} x1="323" y1="96" x2="262" y2="270" gradientUnits="userSpaceOnUse"><stop stopColor="#f8d586" stopOpacity=".25" /><stop offset="1" stopColor="#f8d586" stopOpacity="0" /></linearGradient>
            </defs>
            <ellipse cx="263" cy="169" rx="195" ry="139" fill={`url(#${glow})`} />
            <ellipse cx="246" cy="279" rx="190" ry="15" fill="#06101e" opacity=".6" />
            <path d="M41 257h398" stroke="#d0a660" strokeOpacity=".24" />
            <path d="m310 100-89 145 187 3-62-148Z" fill={`url(#${light})`} />
            <g transform="rotate(-7 137 210)">
                <rect x="63" y="226" width="175" height="27" rx="5" fill="#ae8242" /><path d="M82 232h151v15H82Z" fill="#e9d9b3" /><path d="M87 237h140m-140 5h140" stroke="#b99b66" strokeOpacity=".6" />
                <rect x="52" y="197" width="180" height="28" rx="5" fill="#355168" /><path d="M72 203h154v16H72Z" fill="#f1e5cb" /><path d="M76 208h143m-143 5h143" stroke="#c4b294" />
                <rect x="72" y="171" width="167" height="26" rx="5" fill="#c39957" /><path d="M92 177h141v14H92Z" fill="#eee1c0" /><path d="M99 182h125m-125 5h125" stroke="#bba17c" />
                <path d="M56 196h176M67 225h167" stroke="#e7be70" strokeOpacity=".5" />
            </g>
            <path d="m382 235 19-83-46-70" stroke="#987541" strokeWidth="11" strokeLinecap="round" /><path d="m381 234 19-82-44-68" stroke="#e1b970" strokeWidth="4" strokeLinecap="round" />
            <circle cx="400" cy="151" r="10" fill="#d8b16d" /><circle cx="400" cy="151" r="4" fill="#344559" />
            <path d="m356 56-36 15-30 35 82-2-4-34Z" fill={`url(#${gold})`} /><path d="m290 106 81-2" stroke="#ffe5ae" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="331" cy="107" rx="25" ry="6" fill="#ffe6ae" opacity=".7" />
            <path d="M359 243c0-8 12-15 29-15s29 7 29 15v8h-58Z" fill={`url(#${gold})`} /><path d="M360 244h56" stroke="#f1ce8c" strokeWidth="2" />
            <path d="m90 170-9-73m18 69 9-89m-9 89-27-65" stroke="#d4a65c" strokeWidth="7" strokeLinecap="round" /><path d="m81 99-2-13-2 13m31-19 1-12-5 11" fill="#f7e5bc" />
            <path d="M68 153h49l-6 64H74Z" fill="#254159" stroke="#527088" strokeWidth="2" /><path d="M78 162v40m12-40v40m12-40v40" stroke="#597489" strokeOpacity=".6" />
            <path d="m119 212 116 24 135-31-6 68-131 20-116-20Z" fill="#a77d3e" />
            <path d="M127 185c38-8 69 1 109 22 36-22 76-30 122-26l-5 83c-42-3-79 5-120 22-33-20-69-29-110-24Z" fill={`url(#${paper})`} stroke="#dabb80" strokeWidth="2" />
            <path d="m236 207-3 79" stroke="#b59056" strokeWidth="2" />
            <path d="M141 204c27-2 52 5 75 16m-77-1c28 0 51 7 75 17m-76-2c26 0 51 8 75 17m-76-1c25 1 49 8 73 18M254 220c27-13 48-18 83-18m-84 34c27-12 49-16 82-16m-83 30c28-11 50-15 82-15" stroke="#a38a62" strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
            <path d="m299 183 19-2-3 53-9-8-10 8Z" fill="#b68742" />
            <path d="m406 196 7-4 23 50-7 4Z" fill="#d6b270" /><path d="m429 246 8-4 1 12Z" fill="#f0e1bd" />
            <g fill="#e7be70"><path d="m154 65 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" /><path d="m426 105 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /><circle cx="196" cy="107" r="2" /><circle cx="43" cy="179" r="2" /></g>
            <path d="m217 49 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" stroke="#dcb971" strokeOpacity=".6" />
        </svg>
    );
}
