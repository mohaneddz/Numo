import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, RefreshCcw } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';
import { SpotlightCard } from '../../components/ui/SpotlightCard';

const STORAGE_KEY = 'noema_template_action_log_v1';

interface ActionLogEntry {
  templateId: string;
  entityId: string | null;
  params: Record<string, string>;
  executedAt: string;
}

function readLogs(): ActionLogEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as ActionLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLog(entry: ActionLogEntry): void {
  const logs = readLogs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...logs].slice(0, 40)));
}

export default function TemplateActionPage() {
  const navigate = useNavigate();
  const { templateId = 'unknown', entityId } = useParams();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<string | null>(null);
  const [runCount, setRunCount] = useState(0);

  const params = useMemo(() => {
    const entries = Array.from(searchParams.entries());
    return entries.reduce<Record<string, string>>((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});
  }, [searchParams]);

  const from = params.from;
  const lang = params.lang;

  const handleSimulate = () => {
    const executedAt = new Date().toISOString();
    writeLog({
      templateId,
      entityId: entityId ?? null,
      params,
      executedAt,
    });
    setRunCount((prev) => prev + 1);
    setStatus(`Simulated successfully at ${new Date(executedAt).toLocaleTimeString()}`);
  };

  const handleReroute = () => {
    if (!from) {
      setStatus('No source route was provided.');
      return;
    }
    navigate(from);
  };

  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <button className="page-primary-action" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
      </PageActions>

      <SpotlightCard className="p-6">
        <p className="text-[12px] uppercase tracking-wider text-dim font-bold mb-2">Template Action</p>
        <h1 className="text-[28px] font-bold text-white mb-2">{templateId}</h1>
        <p className="text-[13px] text-dim mb-4">
          This is a simulated destination page for not-yet-finalized flows. URL params and ids are wired and preserved.
        </p>

        <div className="grid gap-2 mb-5 text-[13px]">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-dim">Template ID</span>
            <span className="text-mist font-bold">{templateId}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-dim">Entity ID</span>
            <span className="text-mist font-bold">{entityId ?? 'n/a'}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-dim">Source</span>
            <span className="text-mist font-bold">{from ?? 'n/a'}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-dim">Language</span>
            <span className="text-mist font-bold">{lang ?? 'n/a'}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
            <span className="text-dim">Runs</span>
            <span className="text-mist font-bold">{runCount}</span>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {Object.keys(params).length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-dim">
              No query params provided.
            </div>
          ) : (
            Object.entries(params).map(([key, value]) => (
              <div key={key} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[13px]">
                <span className="text-dim">{key}</span>
                <span className="mx-2 text-dim">=</span>
                <span className="text-mist">{value}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="page-primary-action" onClick={handleSimulate}>
            <CheckCircle2 size={15} /> Simulate Action
          </button>
          <button className="page-primary-action" onClick={handleReroute}>
            <RefreshCcw size={15} /> Return To Source
          </button>
          <Link to="/settings" className="no-underline">
            <button className="page-primary-action">
              <ExternalLink size={15} /> Open Settings
            </button>
          </Link>
        </div>

        {status ? (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-300">
            {status}
          </div>
        ) : null}
      </SpotlightCard>
    </PageContent>
  );
}

