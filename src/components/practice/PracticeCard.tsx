import React from 'react';
import { SpotlightCard } from '../ui/SpotlightCard';

interface PracticeCardProps {
  children: React.ReactNode;
}

export function PracticeCard({ children }: PracticeCardProps) {
  return (
    <SpotlightCard className="p-6 relative max-w-lg mx-auto w-full mb-6">
      {children}
    </SpotlightCard>
  );
}
