import { useState } from 'react';

interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 14, md: 20, lg: 28 };

export default function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;
  const px = sizes[size];

  return (
    <div
      className="inline-flex items-center gap-px"
      onMouseLeave={() => !readonly && setHover(null)}
    >
      {Array.from({ length: 10 }, (_, i) => {
        const halfVal = (i + 1) * 0.5;
        const isLeft = i % 2 === 0;
        const filled = display >= halfVal;

        return (
          <span
            key={i}
            style={{ width: px / 2, height: px, overflow: 'hidden', cursor: readonly ? 'default' : 'pointer' }}
            className="inline-block"
            onMouseEnter={() => !readonly && setHover(halfVal)}
            onClick={() => !readonly && onChange?.(halfVal)}
          >
            <svg
              viewBox="0 0 24 24"
              width={px}
              height={px}
              style={{ marginLeft: isLeft ? 0 : -(px / 2) }}
              className={`transition-colors ${filled ? 'text-yellow-400' : 'text-gray-700'}`}
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </span>
        );
      })}
    </div>
  );
}
