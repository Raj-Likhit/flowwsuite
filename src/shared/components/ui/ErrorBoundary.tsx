import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
                    {/* Ambient Background */}
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[120px]" />
                    </div>

                    <div className="relative z-10 glass-tubular border border-white/10 p-10 rounded-[32px] max-w-md w-full text-center shadow-2xl space-y-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/5 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-red-500/20 shadow-lg shadow-red-500/10">
                            <AlertTriangle className="w-10 h-10 text-red-400" />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-black text-white tracking-tighter">System Error</h1>
                            <p className="text-white/40 text-sm font-medium leading-relaxed px-4">
                                {this.state.error?.message || "The application encountered an unexpected state and needs to recover."}
                            </p>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-white text-black font-black uppercase tracking-widest text-xs py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-[0.98]"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Reboot System
                            </button>
                            <p className="mt-4 text-[10px] uppercase font-bold tracking-[0.2em] text-white/20">
                                Flowwsuite Emergency Protocol
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
