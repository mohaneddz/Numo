import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, Copy, Home, RotateCcw } from 'lucide-react';
import { recordCrash } from '../../services/diagnostics/crashLog';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * Distinguishes a boundary around one page from the one around the whole
   * app. A page-level boundary keeps the shell — and so the navigation —
   * alive, and offers to go Home; the root one can only offer a reload.
   */
  scope: 'app' | 'page';
  /** Changing this resets the boundary, so navigating away clears the error. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string;
}

/**
 * Catches render errors instead of letting them blank the window.
 *
 * There was no boundary anywhere in the app, so a single thrown error in any
 * page unmounted the entire tree and left a white screen with no way back —
 * in a desktop app, that means quitting and reopening.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: '' };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept in the console as well: this is a local app, and the stack is the
    // only record of what happened.
    console.error('Render error caught by boundary', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? '' });

    // Kept on the device so there is something to read after a crash. Never
    // sent anywhere.
    void recordCrash({
      message: error.message || error.name,
      scope: this.props.scope === 'page' ? this.props.resetKey ?? 'page' : 'app',
      stack: error.stack,
    });
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) {
      this.setState({ error: null, componentStack: '' });
    }
  }

  private copyDetails = () => {
    const { error, componentStack } = this.state;
    const details = [error?.name, error?.message, error?.stack, componentStack]
      .filter(Boolean)
      .join('\n\n');
    void navigator.clipboard?.writeText(details);
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    const isPage = this.props.scope === 'page';

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-coral/30 bg-coral-dim">
          <AlertTriangle size={22} className="text-coral" />
        </div>

        <h2 className="font-heading text-2xl text-mist">
          {isPage ? 'This page ran into a problem' : 'Numo ran into a problem'}
        </h2>
        <p className="mt-2 max-w-md text-sm text-dim">
          {isPage
            ? 'The rest of the app is still working — you can go back and carry on. Your saved progress is untouched.'
            : 'Reloading usually clears this. Your saved progress is untouched.'}
        </p>

        <p className="mt-4 max-w-lg break-words rounded-lg border border-white/5 bg-black/30 px-4 py-3 font-mono text-[12px] text-dim">
          {error.message || error.name || 'Unknown error'}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {isPage ? (
            <a href="/" className="no-underline">
              <button type="button" className="page-primary-action">
                <Home size={15} /> Back to Home
              </button>
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-dim transition-colors hover:border-white/25 hover:text-mist"
          >
            <RotateCcw size={15} /> Reload
          </button>

          <button
            type="button"
            onClick={this.copyDetails}
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-dim transition-colors hover:border-white/25 hover:text-mist"
          >
            <Copy size={15} /> Copy details
          </button>
        </div>

        {componentStack && (
          <details className="mt-6 w-full max-w-2xl text-left">
            <summary className="cursor-pointer text-xs text-dim">Technical details</summary>
            <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-white/5 bg-black/40 p-3 text-[11px] leading-relaxed text-dim">
              {error.stack}
              {componentStack}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
