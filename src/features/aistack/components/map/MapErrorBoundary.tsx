"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class MapErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Map subtree crashed:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-background text-foreground">
        <div className="max-w-sm px-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-accent" />
          <h2 className="font-display mt-4 text-xl text-foreground">
            The map couldn&rsquo;t load.
          </h2>
          <p className="font-body mt-2 text-sm text-foreground/72">
            Something went wrong while rendering the map. Try again, or
            reload the page.
          </p>
          {this.state.message && (
            <p className="font-ui mt-3 text-xs text-muted-foreground">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="font-ui mt-5 rounded-full border border-border px-4 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/80"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
