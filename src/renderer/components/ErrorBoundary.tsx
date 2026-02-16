import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <div className="text-4xl">Something went wrong</div>
          <p className="text-muted-foreground max-w-md text-center">
            An unexpected error occurred. Try reloading the page or restarting the application.
          </p>
          <pre className="max-w-lg text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto border">
            {this.state.error?.message}
          </pre>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = '/';
            }}
          >
            Return to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
