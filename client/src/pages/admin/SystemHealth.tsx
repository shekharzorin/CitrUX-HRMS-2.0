
import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icons';
import { Button } from '../../components/ui/Button';
import { healthService, type HealthStatusResponse, type SystemError } from '../../services/health';
import { useToast } from '../../contexts/ToastContext';

const SystemHealth: React.FC = () => {
    const { showToast } = useToast();
    const [status, setStatus] = useState<HealthStatusResponse | null>(null);
    const [errors, setErrors] = useState<SystemError[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [statusData, errorsData] = await Promise.all([
                healthService.getStatus(),
                healthService.getErrors(1, 10)
            ]);
            setStatus(statusData);
            setErrors(errorsData.errors || []);
            setLastUpdated(new Date());
            if (isRefresh) showToast('System status updated', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to fetch system health', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'HEALTHY': return 'text-green-600 bg-green-50';
            case 'DEGRADED': return 'text-orange-600 bg-orange-50';
            case 'DOWN': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return <Badge variant="error">CRITICAL</Badge>;
            case 'WARNING': return <Badge variant="warning">WARNING</Badge>;
            default: return <Badge variant="info">INFO</Badge>;
        }
    };

    if (loading && !status) {
        return <div className="p-8 text-center text-muted">Loading system health info...</div>;
    }

    return (
        <div className="page-container space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1>System Health</h1>
                    <p className="text-muted">Real-time monitoring of system modules and services.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted">Last updated: {lastUpdated.toLocaleTimeString()}</span>
                    <Button variant="secondary" onClick={() => fetchData(true)} disabled={refreshing}>
                        <Icon name="refresh" size={18} className={refreshing ? "animate-spin" : ""} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Overall Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className={`border-l-4 ${status?.status === 'HEALTHY' ? 'border-green-500' : status?.status === 'DOWN' ? 'border-red-500' : 'border-orange-500'}`}>
                    <div className="p-4">
                        <p className="text-sm text-muted mb-1">Overall System Status</p>
                        <h2 className={`text-2xl font-bold ${status?.status === 'HEALTHY' ? 'text-green-600' : status?.status === 'DOWN' ? 'text-red-600' : 'text-orange-600'}`}>
                            {status?.status}
                        </h2>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <p className="text-sm text-muted mb-1">Uptime</p>
                        <h2 className="text-2xl font-bold">{Math.floor((status?.system.uptime || 0) / 3600)}h {Math.floor(((status?.system.uptime || 0) % 3600) / 60)}m</h2>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <p className="text-sm text-muted mb-1">Memory Usage</p>
                        <h2 className="text-2xl font-bold">{status?.system.memory.rss}</h2>
                    </div>
                </Card>
                <Card>
                    <div className="p-4">
                        <p className="text-sm text-muted mb-1">Active Errors</p>
                        <h2 className="text-2xl font-bold">{errors.length}</h2>
                    </div>
                </Card>
            </div>

            {/* Module Health Table */}
            <Card title="Module Status">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 font-medium text-muted">Module Name</th>
                                <th className="px-6 py-3 font-medium text-muted">Status</th>
                                <th className="px-6 py-3 font-medium text-muted">Details</th>
                                <th className="px-6 py-3 font-medium text-muted">Last Checked</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {status?.modules.map((module) => (
                                <tr key={module.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 font-bold">{module.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(module.status)}`}>
                                            <span className={`w-2 h-2 rounded-full mr-1.5 ${module.status === 'HEALTHY' ? 'bg-green-500' : module.status === 'DOWN' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                                            {module.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-muted">
                                        {JSON.stringify(module.details)}
                                    </td>
                                    <td className="px-6 py-4 text-muted">
                                        {new Date(module.lastChecked).toLocaleTimeString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Recent Errors */}
            <Card title="Recent System Errors">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 font-medium text-muted">Severity</th>
                                <th className="px-6 py-3 font-medium text-muted">Module</th>
                                <th className="px-6 py-3 font-medium text-muted">Message</th>
                                <th className="px-6 py-3 font-medium text-muted">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {errors.length === 0 ? (
                                <tr><td colSpan={4} className="p-6 text-center text-muted">No recent errors logged.</td></tr>
                            ) : errors.map((err) => (
                                <tr key={err.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4">{getSeverityBadge(err.severity)}</td>
                                    <td className="px-6 py-4 font-medium">{err.module}</td>
                                    <td className="px-6 py-4 text-error">{err.message}</td>
                                    <td className="px-6 py-4 text-muted">{new Date(err.timestamp).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default SystemHealth;
