import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary per catturare errori React e mostrare UI fallback
 */
class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="text-center max-w-md">
                        <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Oops! Qualcosa è andato storto</h1>
                        <p className="text-muted-foreground mb-6">
                            Si è verificato un errore imprevisto. Ci scusiamo per l&apos;inconveniente.
                        </p>
                        {this.state.error && (
                            <details className="mb-6 text-left bg-secondary/20 p-4 rounded-lg">
                                <summary className="cursor-pointer font-medium mb-2">
                                    Dettagli errore
                                </summary>
                                <code className="text-xs text-muted-foreground block overflow-auto">
                                    {this.state.error.toString()}
                                </code>
                            </details>
                        )}
                        <div className="flex gap-3 justify-center">
                            <Button onClick={this.handleReset} variant="default">
                                Torna alla Home
                            </Button>
                            <Button onClick={() => window.location.reload()} variant="outline">
                                Ricarica Pagina
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
