import { Response } from 'express';
import { prisma } from '../db';
import { Parser } from 'json2csv';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getTenantScope } from '../middlewares/tenant.middleware';

// Helper to stream CSV
const sendCSV = (res: Response, filename: string, fields: string[], data: any[]) => {
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    return res.send(csv);
};

export const getAttendanceReport = async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const scope = getTenantScope(req);

        if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

        const m = parseInt(month as string);
        const y = parseInt(year as string);
        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0);

        // Fetch users within scope
        // @ts-ignore
        const users = await prisma.user.findMany({
            where: { 
                ...scope,
                status: 'ACTIVE' 
            },
            include: { profile: true, shift: true }
        });

        const reportData: any[] = [];

        for (const user of users) {
            // Get Attendance Stats
            // @ts-ignore
            const attendance = await prisma.attendance.findMany({
                where: {
                    userId: user.id,
                    date: { gte: startDate, lte: endDate }
                }
            });

            const present = attendance.filter(a => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
            const late = attendance.filter(a => a.isLate).length;

            // Get Leaves
            // @ts-ignore
            const leaves = await prisma.leaveRequest.findMany({
                where: {
                    userId: user.id,
                    status: 'APPROVED',
                    startDate: { lte: endDate },
                    endDate: { gte: startDate }
                }
            });

            const leaveDays = leaves.reduce((acc, l) => acc + l.days, 0);

            reportData.push({
                EmployeeID: user.employeeId || 'N/A',
                Name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : 'Unknown',
                Department: user.profile?.department || 'N/A',
                TotalDays: endDate.getDate(),
                PresentDays: present,
                LateMarks: late,
                LeavesTaken: leaveDays,
                Shift: user.shift?.name || 'Default'
            });
        }

        return sendCSV(res, `attendance_report_${m}_${y}.csv`,
            ['EmployeeID', 'Name', 'Department', 'TotalDays', 'PresentDays', 'LateMarks', 'LeavesTaken', 'Shift'],
            reportData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating attendance report' });
    }
};

export const getPayrollReport = async (req: AuthRequest, res: Response) => {
    try {
        const { month, year } = req.query;
        const scope = getTenantScope(req);

        if (!month || !year) return res.status(400).json({ message: 'Month and Year required' });

        // @ts-ignore
        const payslips = await prisma.payslip.findMany({
            where: {
                month: parseInt(month as string),
                year: parseInt(year as string),
                user: {
                    ...scope
                }
            },
            include: {
                user: {
                    include: { profile: true }
                }
            }
        });

        const reportData = payslips.map(p => {
            const details = JSON.parse(p.details);
            return {
                EmployeeID: p.user.employeeId || 'N/A',
                Name: p.user.profile ? `${p.user.profile.firstName} ${p.user.profile.lastName}` : 'Unknown',
                Basic: details.earnings.basic,
                HRA: details.earnings.hra,
                Allowances: details.earnings.allowances,
                GrossEarnings: p.gross,
                PF: details.deductions.pf,
                ESI: details.deductions.esi,
                PT: details.deductions.professionalTax,
                LOP_Amount: details.deductions.lopAmount,
                TotalDeductions: details.deductions.totalDeductions,
                NetPay: p.net,
                PaymentDate: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'Pending',
                Status: p.status
            };
        });

        return sendCSV(res, `payroll_register_${month}_${year}.csv`,
            ['EmployeeID', 'Name', 'Basic', 'HRA', 'Allowances', 'GrossEarnings', 'PF', 'ESI', 'PT', 'LOP_Amount', 'TotalDeductions', 'NetPay', 'PaymentDate', 'Status'],
            reportData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating payroll report' });
    }
};

export const getLeaveReport = async (req: AuthRequest, res: Response) => {
    try {
        const scope = getTenantScope(req);
        
        // Leave Liability Report (Current Balances)
        // @ts-ignore
        const balances = await prisma.leaveBalance.findMany({
            where: {
                user: {
                    ...scope,
                    status: { not: 'ARCHIVED' }
                }
            },
            include: {
                user: { include: { profile: true } },
                leaveType: true
            }
        });

        const reportData = balances.map((b: any) => ({
            EmployeeID: b.user.employeeId || 'N/A',
            Name: b.user.profile ? `${b.user.profile.firstName} ${b.user.profile.lastName}` : 'Unknown',
            LeaveType: b.leaveType.name,
            Code: b.leaveType.code,
            Quota: b.leaveType.daysPerYear,
            Used: b.used,
            Balance: b.balance
        }));

        return sendCSV(res, `leave_liability_report_${new Date().toISOString().split('T')[0]}.csv`,
            ['EmployeeID', 'Name', 'LeaveType', 'Code', 'Quota', 'Used', 'Balance'],
            reportData);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error generating leave report' });
    }
};
