import { PageContent } from '../../components/layout/PageLayout';
import { SpotlightCard } from '../../components/ui/SpotlightCard';

export default function NotificationsPage() {
  return (
    <PageContent width="narrow" className="pb-24">
      <h1 className="text-[28px] font-bold text-white mb-6">Notifications</h1>
      <SpotlightCard className="p-6">
        <p className="text-dim text-[14px]">You have no new notifications.</p>
      </SpotlightCard>
    </PageContent>
  );
}