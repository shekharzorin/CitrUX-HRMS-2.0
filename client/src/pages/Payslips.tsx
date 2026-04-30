import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { RunPayrollModal } from '../components/payroll/RunPayrollModal';
import { payrollService } from '../services/payroll';
import { PageHeader } from '../components/ui/PageHeader';

interface Payslip {
    id: string;
    month: number;
    year: number;
    generatedAt: string;
    gross: number;
    net: number;
    details?: string;
    status: string;
    url?: string;
}

const Payslips: React.FC = () => {
    const { user } = useAuth();
    const [payslips, setPayslips] = useState<Payslip[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

    useEffect(() => {
        fetchPayslips();
    }, [user]);

    const fetchPayslips = async () => {
        setLoading(true);
        try {
            // Updated endpoint to match backend route
            const data = await api.get<Payslip[]>('/payslips/my-payslips');
            setPayslips(data || []);
        } catch (error) {
            console.error("Failed to fetch payslips", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id: string) => {
        try {
            // For now, assuming backend provides a download link or we use the dedicated endpoint
            const downloadUrl = payrollService.getDownloadUrl(id);
            window.open(downloadUrl, '_blank');
        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download payslip. Please try again.");
        }
    };

    return (
        <div className="page-container space-y-8">
            <PageHeader
                title="My Payslips"
                subtitle="View and download your monthly salary statements"
                icon="download"
                gradient="gradient-cyan"
                actions={
                    (user?.role === 'ADMIN' || user?.role === 'HR') && (
                        <button
                            onClick={() => setIsPayrollModalOpen(true)}
                            className="px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl backdrop-blur-md border border-white/30 transition-all flex items-center gap-2 shadow-lg"
                        >
                            <span className="text-xl">⚡</span>
                            Run Payroll Wizard
                        </button>
                    )
                }
            />

            {/* Run Payroll Modal */}
            <RunPayrollModal
                isOpen={isPayrollModalOpen}
                onClose={() => setIsPayrollModalOpen(false)}
                onSuccess={() => {
                    fetchPayslips();
                    setIsPayrollModalOpen(false);
                }}
            />

            {/* Payslips History Grid */}
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 px-2">My Payslip History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in delay-100">
                {loading ? (
                    <div className="col-span-full p-20 text-center">
                        <div className="animate-spin w-10 h-10 border-4 border-[var(--primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500 font-bold">Loading Payslips...</p>
                    </div>
                ) : payslips.length > 0 ? payslips.map((p: Payslip) => (
                    <div key={p.id} className="dashboard-section p-0 overflow-hidden group hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-800">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300 rounded-xl font-black text-xs uppercase tracking-widest border border-emerald-100 dark:border-emerald-800/30">
                                    {new Date(0, p.month - 1).toLocaleString('default', { month: 'long' })} {p.year}
                                </div>
                                <span className="px-2 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-sm">PAID</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Salary</div>
                                    <div className="text-2xl font-black text-slate-800 dark:text-white">₹{p.net.toLocaleString()}</div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Gross Salary</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">₹{p.gross.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Deductions</span>
                                        <span className="font-bold text-rose-500">₹{(p.gross - p.net).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/10 transition-colors">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Issued: {new Date(p.generatedAt).toLocaleDateString()}</span>
                            <button
                                onClick={() => handleDownload(p.id)}
                                className="text-[var(--primary)] font-bold text-xs hover:underline flex items-center gap-1"
                            >
                                <span>📥</span> Download
                            </button>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full dashboard-section text-center p-20">
                        <div className="text-4xl mb-4">💸</div>
                        <p className="font-bold text-slate-500">No payslips found in your record.</p>
                        <p className="text-xs text-slate-400">Once generated by HR, your payslips will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payslips;
