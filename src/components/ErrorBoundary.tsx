import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render-time crashes so a single broken screen does not leave the user
 * staring at a blank page. Data-fetch failures are handled inline per screen;
 * this is the last line of defence.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="grid min-h-dvh place-items-center bg-bg p-6">
        <div className="w-full max-w-md overflow-hidden rounded-lg border border-error bg-card text-center">
          <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-error to-primary" />
          <div className="flex flex-col items-center gap-3 p-8">
            <span aria-hidden="true" className="text-5xl">
              🐉
            </span>
            <h1 className="text-xl font-black text-ink">De draak struikelde</h1>
            <p className="text-sm leading-relaxed text-muted">
              Er ging iets mis bij het tonen van dit scherm. Probeer opnieuw, of herlaad het Hof.
            </p>
            <pre className="max-h-32 w-full overflow-auto rounded-md border border-edge bg-bg p-3 text-left text-xs text-muted">
              {error.message}
            </pre>
            <div className="mt-2 flex w-full gap-2">
              <Button variant="outline" block onClick={this.reset}>
                Opnieuw proberen
              </Button>
              <Button block onClick={() => window.location.reload()}>
                Herlaad
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
