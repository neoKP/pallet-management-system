import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Error Boundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
        window.location.reload();
    };

    public render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900">
                    <div className="max-w-2xl w-full glass p-12 rounded-[3rem] border border-white/20 shadow-2xl text-center">
                        <div className="mb-8">
                            <div className="inline-flex p-6 bg-red-500 rounded-full mb-6">
                                <AlertCircle size={48} className="text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-white mb-4">
                                เกิดข้อผิดพลาด
                            </h1>
                            <p className="text-slate-300 text-lg mb-2">
                                ขออภัย เกิดข้อผิดพลาดที่ไม่คาดคิด
                            </p>
                            <p className="text-slate-400 text-sm">
                                กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mb-8 p-6 bg-red-950/50 border border-red-500/20 rounded-2xl text-left">
                                <h3 className="text-red-400 font-bold mb-3 text-sm uppercase tracking-widest">
                                    Error Details (Dev Mode)
                                </h3>
                                <pre className="text-red-300 text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </div>
                        )}

                        <button
                            onClick={this.handleReset}
                            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-full font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-2xl"
                        >
                            <RefreshCw size={20} />
                            โหลดหน้าใหม่
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
