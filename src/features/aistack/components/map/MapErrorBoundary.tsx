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
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-neutral-950 text-neutral-200">
        <div className="max-w-sm px-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-amber-400" />
          <h2 className="mt-4 font-serif text-xl text-white">
            The map couldn&rsquo;t load.
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Something went wrong while rendering the map. Try again, or
            reload the page.
          </p>
          {this.state.message && (
            <p className="mt-3 font-mono text-xs text-neutral-500">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-5 rounded-full border border-white/20 px-4 py-1.5 text-sm text-neutral-100 transition-colors hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
