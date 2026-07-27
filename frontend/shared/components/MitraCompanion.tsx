'use client';

import dynamic from 'next/dynamic';

const CompanionOverlay = dynamic(
  () => import('./companion/render/CompanionOverlay'),
  { 
    ssr: false,
    loading: () => null 
  }
);

export default function MitraCompanion() {
  return <CompanionOverlay />;
}
