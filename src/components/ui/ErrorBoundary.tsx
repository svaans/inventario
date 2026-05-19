import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Error desconocido" };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center rounded-xl border border-destructive/30 bg-destructive/5">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            {this.props.label ?? "Error al cargar este componente"}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
