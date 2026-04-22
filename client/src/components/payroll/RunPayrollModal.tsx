import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button'; // Assuming we have these

import { payrollService, type PayrollCalculation } from '../../services/payroll';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

interface RunPayrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const STEPS = ['Select Period', 'Select Employees', 'Review', 'Confirm'];

export const RunPayrollModal: React.FC<RunPayrollModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const [step, setStep] = useState(0);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [calculations, setCalculations] = useState<PayrollCalculation[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && step === 1) {
            fetchEmployees();
        }
    }, [isOpen, step]);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            // Fetch all active employees
            // Assuming we have an endpoint for this. Using a generic GET for now.
            // Adjust endpoint as per User Controller
            const data = await api.get<any[]>('/users?status=ACTIVE');
            setEmployees(data);
            setSelectedEmployeeIds(data.map(u => u.id)); // Default select all
        } catch (error) {
            console.error(error);
            showToast('Failed to load employees', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const results = await payrollService.calculate(selectedEmployeeIds, month, year);
            setCalculations(results as any);
            setStep(2);
        } catch (error) {
            console.error(error);
            showToast('Calculation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            await payrollService.generate(selectedEmployeeIds, month, year);
            showToast('Payroll generated successfully!', 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            showToast('Generation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Run Payroll</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* Steps */}
                <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-3 flex gap-4 text-sm border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
                    {STEPS.map((s, i) => (
                        <div key={i} className={`flex items-center gap-2 ${i === step ? 'text-primary font-bold' : i < step ? 'text-success' : 'text-gray-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${i === step ? 'bg-primary text-white' : i < step ? 'bg-success text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {i + 1}
                            </div>
                            {s}
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 0 && (
                        <div className="space-y-4 max-w-sm mx-auto mt-8">
                            <div>
                                <label htmlFor="select-month" className="block text-sm font-medium mb-1">Month</label>
                                <select
                                    id="select-month"
                                    className="w-full p-2 border rounded-lg bg-transparent"
                                    value={month}
                                    title="Select Month"
                                    onChange={e => setMonth(parseInt(e.target.value))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="input-year" className="block text-sm font-medium mb-1">Year</label>
                                <input
                                    id="input-year"
                                    type="number"
                                    className="w-full p-2 border rounded-lg bg-transparent"
                                    value={year}
                                    title="Enter Year"
                                    placeholder="YYYY"
                                    onChange={e => setYear(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <div className="flex justify-between mb-4">
                                <h3 className="font-bold">Select Employees ({selectedEmployeeIds.length})</h3>
                                <Button size="sm" variant="secondary" onClick={() => setSelectedEmployeeIds(selectedEmployeeIds.length === employees.length ? [] : employees.map(e => e.id))}>
                                    {selectedEmployeeIds.length === employees.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>
                            {loading ? <p>Loading employees...</p> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {employees.map(emp => (
                                        <div key={emp.id} className={`p-3 border rounded-lg flex items-center gap-3 cursor-pointer ${selectedEmployeeIds.includes(emp.id) ? 'border-primary bg-primary/5' : 'hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                            onClick={() => {
                                                if (selectedEmployeeIds.includes(emp.id)) {
                                                    setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.id));
                                                } else {
                                                    setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                                                }
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedEmployeeIds.includes(emp.id)}
                                                readOnly
                                                aria-label={`Select ${emp.profile?.firstName} ${emp.profile?.lastName}`}
                                                title={`Select ${emp.profile?.firstName} ${emp.profile?.lastName}`}
                                            />
                                            <div>
                                                <div className="font-bold">{emp.profile?.firstName} {emp.profile?.lastName}</div>
                                                <div className="text-xs text-muted">{emp.employeeId} • {emp.profile?.designation || 'No Role'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h3 className="font-bold mb-4">Calculation Preview</h3>
                            {loading ? <p>Calculating...</p> : (
                                <div className="space-y-2">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="p-2">Employee</th>
                                                    <th className="p-2">Working Days</th>
                                                    <th className="p-2">Present</th>
                                                    <th className="p-2">LOP Days</th>
                                                    <th className="p-2">Gross</th>
                                                    <th className="p-2">Deductions</th>
                                                    <th className="p-2">Net Pay</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {calculations.map((calc, i) => (
                                                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                        <td className="p-2">
                                                            <div className="font-medium">{calc.user.profile?.firstName} {calc.user.profile?.lastName}</div>
                                                            <div className="text-xs text-muted">{calc.user.employeeId}</div>
                                                        </td>
                                                        <td className="p-2">{calc.calculation?.attendance.workingDays}</td>
                                                        <td className="p-2">{calc.calculation?.attendance.presentDays}</td>
                                                        <td className="p-2 text-warning font-bold">{calc.calculation?.attendance.lopDays}</td>
                                                        <td className="p-2">{calc.calculation?.earnings.gross.toFixed(2)}</td>
                                                        <td className="p-2 text-error">{calc.calculation?.deductions.totalDeductions.toFixed(2)}</td>
                                                        <td className="p-2 font-bold text-success">{calc.calculation?.netPay.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">💰</div>
                            <h3 className="text-2xl font-bold mb-2">Ready to Process Payroll</h3>
                            <p className="text-muted mb-8">
                                You are about to generate payslips for <b>{selectedEmployeeIds.length} employees</b> for <b>{new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}</b>.
                            </p>
                            <div className="flex justify-center gap-8 text-left max-w-md mx-auto bg-gray-50 dark:bg-slate-800 p-6 rounded-xl">
                                <div>
                                    <div className="text-sm text-muted">Total Employees</div>
                                    <div className="text-xl font-bold">{selectedEmployeeIds.length}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted">Total Gross</div>
                                    <div className="text-xl font-bold">{calculations.reduce((sum, c) => sum + (c.calculation?.earnings.gross || 0), 0).toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted">Total Net Pay</div>
                                    <div className="text-xl font-bold text-primary">{calculations.reduce((sum, c) => sum + (c.calculation?.netPay || 0), 0).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                    <Button variant="secondary" onClick={() => step === 0 ? onClose() : setStep(step - 1)} disabled={loading}>
                        {step === 0 ? 'Cancel' : 'Back'}
                    </Button>

                    {step === 0 && <Button onClick={() => setStep(1)}>Next: Select Employees</Button>}
                    {step === 1 && <Button onClick={handleCalculate} disabled={selectedEmployeeIds.length === 0}>Next: Review</Button>}
                    {step === 2 && <Button onClick={() => setStep(3)}>Next: Confirm</Button>}
                    {step === 3 && <Button variant="primary" onClick={handleGenerate} disabled={loading}>{loading ? 'Processing...' : 'Generate Payslips'}</Button>}
                </div>
            </div>
        </div>
    );
};
