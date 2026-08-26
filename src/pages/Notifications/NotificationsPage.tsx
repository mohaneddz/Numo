import { Link } from 'react-router-dom';
import { PageContent } from '../../components/layout/PageLayout';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationsPage() {
  const notifications = useNotifications();

  return (
    <PageContent width="narrow" className="pb-24">
      <h1 className="text-[28px] font-bold text-white mb-6">Notifications</h1>
      {notifications.length === 0 ? (
        <SpotlightCard className="p-6">
          <p className="text-dim text-[14px]">You have no new notifications.</p>
        </SpotlightCard>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <SpotlightCard key={notification.id} className="p-5">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    notification.tone === 'warning'
                      ? 'border-amber/20 bg-amber/10 text-amber'
                      : 'border-violet/20 bg-violet/10 text-violet'
                  }`}
                >
                  <notification.icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-mist">{notification.title}</p>
                  <p className="mt-1 text-[13px] text-dim">{notification.description}</p>
                  <Link to={notification.cta.to} className="no-underline">
                    <button className="mt-3 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-mist transition-colors">
                      {notification.cta.label}
                    </button>
                  </Link>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}
    </PageContent>
  );
}
