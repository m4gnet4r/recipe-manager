'use client';

import { useState } from 'react';
import { categoryEmoji, gradientFor, photoUrlFor } from '../lib/category-visuals';

/**
 * A recipe's "hero" photo. Tries a real (free, keyless) food photo keyed by
 * category, and falls back to a deterministic warm gradient + category
 * emoji if the photo fails to load — so the UI stays appealing even
 * offline or if the external photo source is unreachable.
 */
export function RecipeImage({
  id,
  name,
  category,
  className = '',
  width = 480,
  height = 320,
}: {
  id: string;
  name: string;
  category?: string | null;
  className?: string;
  width?: number;
  height?: number;
}) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br ${gradientFor(id)} ${className}`}
      >
        <span className="text-6xl drop-shadow-sm" role="img" aria-label={name}>
          {categoryEmoji(category)}
        </span>
      </div>
    );
  }

  return (
    // Plain <img>, not next/image: the source is an arbitrary external
    // host chosen per-category at render time, which next/image would
    // otherwise require allow-listing in next.config.js for.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrlFor(id, category, width, height)}
      alt={name}
      onError={() => setErrored(true)}
      loading="lazy"
      className={`object-cover ${className}`}
    />
  );
}
