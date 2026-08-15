import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[BocaSoft] Error en la interfaz:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#f4f4f5",
            color: "#18181b",
          }}
        >
          <div
            style={{
              maxWidth: 480,
              background: "#fff",
              border: "1px solid #d4d4d8",
              borderRadius: 8,
              padding: 24,
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            }}
          >
            <h1 style={{ margin: "0 0 12px", fontSize: 20 }}>BocaSoft</h1>
            <p style={{ margin: "0 0 16px", lineHeight: 1.5 }}>
              La ventana dejó de responder por un error interno. Puede recargar la aplicación para
              continuar.
            </p>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: 13,
                color: "#71717a",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid #2563eb",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
