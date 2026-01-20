import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui/Button';
import { Icon } from './ui/Icons';

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
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                            <Icon name="alert" size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            We encountered an unexpected error. Please try reloading the page.
                        </p>

                        {this.state.error && (
                            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-lg text-left mb-6 overflow-auto max-h-40">
                                <code className="text-xs text-rose-600 font-mono block">
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button onClick={this.handleReload} fullWidth>
                                <Icon name="refresh" size={18} className="mr-2" />
                                Reload Page
                            </Button>
                            <Button variant="outline" onClick={this.handleLogout} fullWidth>
                                <Icon name="logout" size={18} className="mr-2" />
                                Clear Session & Login
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
