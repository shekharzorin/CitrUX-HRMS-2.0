import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icons';
import { payrollService } from '../../services/payroll';
import type { PayrollStats } from '../../services/payroll';
import { RunPayrollModal } from '../../components/payroll/RunPayrollModal';
import { useToast } from '../../contexts/ToastContext';

const Payroll: React.FC = () => {
    const { showToast } = useToast();
    const [stats, setStats] = useState<PayrollStats | null>(null);
    const [payslips, setPayslips] = useState<any[]>([]);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [isRunModalOpen, setIsRunModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsData, listData] = await Promise.all([
                payrollService.getStats(month, year),
                payrollService.list(month, year)
            ]);
            setStats(statsData);
            if (Array.isArray(listData)) {
                setPayslips(listData);
            } else {
                setPayslips([]);
                console.error('Invalid payslips data:', listData);
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to load payroll data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (id: string) => {
        const url = payrollService.getDownloadUrl(id);
        window.open(url, '_blank');
    };

    return (
        <div className="page-container space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1>Payroll Management</h1>
                    <p className="text-muted">Manage salaries, calculate payouts, and generate payslips.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="p-2 border rounded-lg bg-white dark:bg-slate-800"
                        value={month}
                        onChange={e => setMonth(parseInt(e.target.value))}
                        title="Select Month"
                        aria-label="Select Month"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        className="p-2 border rounded-lg bg-white dark:bg-slate-800"
                        value={year}
                        onChange={e => setYear(parseInt(e.target.value))}
                        title="Select Year"
                        aria-label="Select Year"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                    <Button variant="primary" leftIcon={<Icon name="plus" />} onClick={() => setIsRunModalOpen(true)}>
                        Run Payroll
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                            <Icon name="employees" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted">Total Employees</p>
                            <h3 className="text-2xl font-bold">{stats?.totalEmployees || 0}</h3>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-green-50 text-green-600">
                            <Icon name="check_circle" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted">Processed</p>
                            <h3 className="text-2xl font-bold">{stats?.processedCount || 0}</h3>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-orange-50 text-orange-600">
                            <Icon name="schedule" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted">Pending</p>
                            <h3 className="text-2xl font-bold">{stats?.pendingCount || 0}</h3>
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                            <Icon name="payroll" size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-muted">Total Cost</p>
                            <h3 className="text-2xl font-bold">₹{(stats?.totalCost || 0).toLocaleString()}</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold">Generated Payslips</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="px-6 py-3 font-medium text-muted">Employee</th>
                                <th className="px-6 py-3 font-medium text-muted">Department</th>
                                <th className="px-6 py-3 font-medium text-muted">Gross Pay</th>
                                <th className="px-6 py-3 font-medium text-muted">Net Pay</th>
                                <th className="px-6 py-3 font-medium text-muted">Status</th>
                                <th className="px-6 py-3 font-medium text-muted">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading && payslips.length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center text-muted">Loading...</td></tr>
                            ) : payslips.length === 0 ? (
                                <tr><td colSpan={6} className="p-6 text-center text-muted">No payslips generated for this period.</td></tr>
                            ) : payslips.map(slip => {
                                if (!slip || !slip.user) return null;
                                const profile = slip.user.profile || {};
                                return (
                                    <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-main">{profile.firstName || 'Unknown'} {profile.lastName || ''}</div>
                                            <div className="text-xs text-muted">{slip.user.employeeId || 'No ID'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-muted">{profile.department || '-'}</td>
                                        <td className="px-6 py-4">₹{(slip.gross || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4 font-bold text-main">₹{(slip.net || 0).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={slip.status === 'PAID' ? 'success' : 'info'}>{slip.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/5" onClick={() => handleDownload(slip.id)}>
                                                <Icon name="download" size={16} className="mr-2" /> Download
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <RunPayrollModal
                isOpen={isRunModalOpen}
                onClose={() => setIsRunModalOpen(false)}
                onSuccess={() => fetchData()}
            />
        </div>
    );
};

export default Payroll;
