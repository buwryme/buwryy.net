interface ForgejoIconProps {
    size?: number;
    className?: string;
}

export default function ForgejoIcon({ size = 18, className }: ForgejoIconProps)
{
    return (
        <svg
            viewBox="0 0 212 212"
            width={size}
            height={size}
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth={25}
            strokeLinecap="round"
            aria-hidden="true"
        >
            <g transform="translate(6,6)">
                <path d="M58 168 v-98 a50 50 0 0 1 50-50 h20" />
                <path d="M58 168 v-30 a50 50 0 0 1 50-50 h20" />
                <circle cx="142" cy="20" r="18" strokeWidth={15} />
                <circle cx="142" cy="88" r="18" strokeWidth={15} />
                <circle cx="58" cy="180" r="18" strokeWidth={15} />
            </g>
        </svg>
    );
}
