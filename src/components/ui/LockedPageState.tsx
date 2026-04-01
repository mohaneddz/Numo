import { Link } from 'react-router-dom';
import { SpotlightCard } from './SpotlightCard';

interface LockedPageStateProps {
  title: string;
  whatThisPageIsFor: string;
  whyLocked: string;
  unlocksWhen: string;
  nextAction: string;
  nextActionTo: string;
}

export function LockedPageState({
  title,
  whatThisPageIsFor,
  whyLocked,
  unlocksWhen,
  nextAction,
  nextActionTo,
}: LockedPageStateProps) {
  return (
    <div className="mx-auto max-w-3xl py-4">
      <SpotlightCard className="p-6">
        <h2 className="text-[24px] font-bold text-white">{title}</h2>
        <p className="mt-3 text-[14px] text-dim">
          <span className="font-semibold text-mist">What this page is for:</span> {whatThisPageIsFor}
        </p>
        <p className="mt-2 text-[14px] text-dim">
          <span className="font-semibold text-mist">Why it is locked:</span> {whyLocked}
        </p>
        <p className="mt-2 text-[14px] text-dim">
          <span className="font-semibold text-mist">What unlocks it:</span> {unlocksWhen}
        </p>
        <p className="mt-2 text-[14px] text-dim">
          <span className="font-semibold text-mist">What to do next:</span> {nextAction}
        </p>
        <div className="mt-5">
          <Link to={nextActionTo} className="no-underline">
            <button className="page-primary-action">Go to Next Step</button>
          </Link>
        </div>
      </SpotlightCard>
    </div>
  );
}