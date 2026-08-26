import { useState } from 'react';
import { brandColor, brandLogoUrl, monogramLetter } from '../lib/brands';
import { Icon } from './Icon';

interface Props {
  brand?: string | null;
  /** Diameter in px (pin 38 · list/popover 44 · detail 52). */
  size: number;
  className?: string;
}

/**
 * Circular brand avatar: white disc + runtime favicon logo. Falls back to a
 * monogram (brand color background, bold white first letter) when the logo
 * fails to load or the brand is unknown; unknown *and* unnamed stations get
 * a fuel-pump glyph instead of a letter.
 */
export function BrandAvatar({ brand, size, className = '' }: Props) {
  const logoUrl = brandLogoUrl(brand);
  // Track the URL that failed rather than a boolean: a recycled row that
  // switches brands automatically retries the new logo, no effect needed.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const showLogo = logoUrl !== null && failedUrl !== logoUrl;
  const letter = monogramLetter(brand);

  return (
    <div
      aria-hidden="true"
      className={`rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-outline-variant ${className}`}
      style={{ width: size, height: size, background: showLogo ? '#fff' : brandColor(brand) }}
    >
      {showLogo ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          style={{ width: size * 0.58, height: size * 0.58, objectFit: 'contain' }}
          onError={() => setFailedUrl(logoUrl)}
        />
      ) : letter ? (
        <span
          className="font-bold text-white select-none"
          style={{ fontSize: Math.round(size * 0.42), lineHeight: 1 }}
        >
          {letter}
        </span>
      ) : (
        <Icon name="local_gas_station" size={Math.round(size * 0.5)} className="text-white" />
      )}
    </div>
  );
}
