interface BrandLogoProps {
  className?: string;
  label?: string;
  showName?: boolean;
}

export function BrandLogo({
  className,
  label = "Chat",
  showName = false,
}: Readonly<BrandLogoProps>) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <img
        src="/icon.svg"
        alt=""
        aria-hidden="true"
        className="h-full w-auto shrink-0"
      />
      {showName && (
        <span className="font-semibold tracking-tight text-slate-100">
          {label}
        </span>
      )}
    </span>
  );
}
