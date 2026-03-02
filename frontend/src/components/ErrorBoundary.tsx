import { Component, type ErrorInfo, type ReactNode } from 'react';
import PixelButton from './PixelButton';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="mb-6 rounded-full bg-red-500/10 p-6">
            <svg className="h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-200">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">{this.state.error.message}</p>
          <PixelButton
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-8"
          >
            Try again
          </PixelButton>
        </div>
      );
    }
    return this.props.children;
  }
}
