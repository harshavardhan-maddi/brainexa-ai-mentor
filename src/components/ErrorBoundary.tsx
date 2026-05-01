import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center">
            <div className="w-24 h-24 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-destructive text-3xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">We apologize for the inconvenience. Please refresh the page.</p>
            {this.state.error && (
              <div className="bg-muted p-4 rounded-xl text-left mb-8 overflow-auto max-h-40">
                <p className="text-xs font-mono text-muted-foreground break-words">{this.state.error.message}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-2">Error source: {this.state.error.stack?.split('\n')[1]}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()} 
              className="gradient-purple text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

