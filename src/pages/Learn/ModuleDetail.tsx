import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageActions, PageContent } from '../../components/layout/PageLayout';

export default function ModuleDetail() {
  return (
    <PageContent width="narrow" className="pb-12">
      <PageActions>
        <Link to="/learn" className="no-underline">
          <button className="page-primary-action">
            <ArrowLeft size={16} /> Back to Learn
          </button>
        </Link>
      </PageActions>

      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ marginBottom: 8 }}>Module View Unavailable</h2>
        <p style={{ color: 'var(--color-dim)', margin: 0 }}>
          Synthetic module/lesson demo data was removed from the core Learn route. This screen will return once curriculum detail is fully wired to persisted curriculum queries.
        </p>
      </div>
    </PageContent>
  );
}
