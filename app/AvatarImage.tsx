'use client';

import { useState } from 'react';

export default function AvatarImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-semibold flex items-center justify-center select-none">
        {name[0].toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="w-7 h-7 rounded-full"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  );
}
