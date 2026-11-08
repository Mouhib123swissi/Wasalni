'use client';
import { useState } from 'react';
export default function SafeImage({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) return null;
  return <img src={src} alt={alt} loading="lazy" onError={() => setErr(true)} className={className} />;
}
