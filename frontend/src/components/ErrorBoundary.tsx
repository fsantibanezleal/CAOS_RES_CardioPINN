// App-wide error boundary: a single render throw in any route (a malformed trace, a bad field, a kit bug) must
// not white-screen the whole SPA. It catches, shows a readable fallback with the error, and offers a reload,
// so a data/render failure degrades gracefully instead of blanking all six routes. Theme-aware via shell vars.
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // surface to the console for debugging; no telemetry (offline, static app)
    console.error('CardioPINN render error:', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div role="alert" style={{
        maxWidth: 640, margin: '10vh auto', padding: '24px 26px',
        border: '1px solid var(--color-border)', borderRadius: 12, background: 'var(--color-surface)',
        color: 'var(--color-fg)', fontFamily: 'var(--font-sans, system-ui)',
      }}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>Something went wrong rendering this view.</h2>
        <p style={{ color: 'var(--color-fg-subtle)', lineHeight: 1.5 }}>
          A view failed to render, most likely from an unexpected data trace. The rest of the app is unaffected;
          reloading usually recovers it.
        </p>
        <pre style={{
          overflowX: 'auto', fontSize: '0.8rem', background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 12px', color: 'var(--color-fg-subtle)',
        }}>{String(error.message || error)}</pre>
        <button type="button" onClick={() => { this.setState({ error: null }); location.reload(); }} style={{
          marginTop: 12, padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
          border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-fg)',
          fontFamily: 'inherit', fontSize: '0.9rem',
        }}>Reload</button>
      </div>
    );
  }
}
