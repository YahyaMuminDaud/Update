"use client";

import Image from "next/image";
import { useState } from "react";

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + second).toUpperCase();
}

export function Avatar({
  name,
  photoUrl,
  size = 40,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = photoUrl && !errored;

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium select-none"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden={showImage ? undefined : "true"}
    >
      {showImage ? (
        <Image
          src={photoUrl}
          alt={`${name}'s avatar`}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setErrored(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        initialsFrom(name)
      )}
    </div>
  );
}
