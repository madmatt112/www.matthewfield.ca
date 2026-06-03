interface AvatarPlaceholderProps {
  size?: number;
  initials?: string;
  label?: string;
}

export function AvatarPlaceholder({ size = 160, initials = "MF", label }: AvatarPlaceholderProps) {
  return (
    <svg
      role="img"
      aria-label={label ?? `${initials} avatar placeholder`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="shrink-0 rounded-full border border-border bg-muted text-foreground"
    >
      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="40"
        fontWeight="600"
        fill="currentColor"
      >
        {initials}
      </text>
    </svg>
  );
}
