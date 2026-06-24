import * as React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./button";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FeatureErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Feature Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-destructive/10 border-destructive/20 text-destructive animate-in fade-in zoom-in-95">
          <AlertTriangle className="w-10 h-10 mb-4 opacity-80" />
          <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm opacity-80 max-w-sm mb-4">
            We couldn't load this component. Please try again.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false })}
            className="border-destructive/30 hover:bg-destructive/20"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
