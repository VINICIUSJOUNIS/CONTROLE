export function CoffeeSackIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.3 3h5.4l1 4c2 1.2 3.1 4 3.1 7 0 4.4-3.5 7.5-7.8 7.5S3.2 18.4 3.2 14c0-3 1.1-5.8 3.1-7l1-4Z" />
      <path d="M7.3 6.6h9.4" />
      <path d="M9.6 3v2M14.4 3v2" />
      <circle cx="10.3" cy="14.5" r="1.1" />
      <circle cx="13.9" cy="13.2" r="1.1" />
      <circle cx="12" cy="16.8" r="1.1" />
    </svg>
  );
}

export function ShippingContainerIcon({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2.2" y="5" width="19.6" height="14" rx="1" />
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="2.2" y1="9.3" x2="21.8" y2="9.3" />
      <line x1="2.2" y1="13" x2="21.8" y2="13" />
      <line x1="2.2" y1="16.7" x2="21.8" y2="16.7" />
      <line x1="6.8" y1="11" x2="6.8" y2="13" />
      <line x1="17.2" y1="11" x2="17.2" y2="13" />
    </svg>
  );
}
