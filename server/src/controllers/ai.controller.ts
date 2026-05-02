import { Request, Response } from 'express';
import { prisma } from '../db';
import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function buildContext(userId: string, role: string, companyId: string | null, message: string) {
    const lower = message.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ctx: Record<string, any> = {};

    const isAbout = (...keywords: string[]) => keywords.some(k => lower.includes(k));

    try {
        // Always get the requester's profile
        const profile = await prisma.profile.findUnique({ where: { userId } });
        ctx.requester = {
            name: profile ? `${profile.firstName} ${profile.lastName}` : 'User',
            role,
            designation: profile?.designation,
            department: profile?.department,
        };

        if (isAbout('leave', 'leaves', 'holiday', 'vacation', 'off')) {
            if (role === 'EMPLOYEE' || role === 'MANAGER') {
                const balances = await prisma.leaveBalance.findMany({
                    where: { userId },
                    include: { leaveType: true },
                });
                ctx.myLeaveBalances = balances.map(b => ({
                    type: b.leaveType.name,
                    balance: b.balance,
                    used: b.used,
                    total: b.leaveType.daysPerYear,
                }));

                const recentLeaves = await prisma.leaveRequest.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    include: { leaveType: true },
                });
                ctx.myRecentLeaveRequests = recentLeaves.map(l => ({
                    type: l.leaveType.name,
                    startDate: l.startDate.toDateString(),
                    endDate: l.endDate.toDateString(),
                    days: l.days,
                    status: l.status,
                    reason: l.reason,
                }));
            }

            if ((role === 'ADMIN' || role === 'HR' || role === 'MANAGER') && companyId) {
                // Who is on leave today
                const onLeaveToday = await prisma.leaveRequest.findMany({
                    where: {
                        status: 'APPROVED',
                        startDate: { lte: new Date() },
                        endDate: { gte: today },
                        user: { companyId },
                    },
                    include: { user: { include: { profile: true } }, leaveType: true },
                });
                ctx.employeesOnLeaveToday = onLeaveToday.map(l => ({
                    name: l.user.profile ? `${l.user.profile.firstName} ${l.user.profile.lastName}` : l.user.email,
                    department: l.user.profile?.department,
                    leaveType: l.leaveType.name,
                    from: l.startDate.toDateString(),
                    to: l.endDate.toDateString(),
                }));

                // Pending leave approvals
                const pendingLeaves = await prisma.leaveRequest.findMany({
                    where: { status: 'PENDING', user: { companyId } },
                    include: { user: { include: { profile: true } }, leaveType: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                });
                ctx.pendingLeaveApprovals = pendingLeaves.map(l => ({
                    name: l.user.profile ? `${l.user.profile.firstName} ${l.user.profile.lastName}` : l.user.email,
                    type: l.leaveType.name,
                    days: l.days,
                    from: l.startDate.toDateString(),
                }));
            }
        }

        if (isAbout('attendance', 'present', 'absent', 'late', 'check in', 'clock')) {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            if (role === 'EMPLOYEE') {
                const myAttendance = await prisma.attendance.findMany({
                    where: { userId, date: { gte: startOfMonth } },
                    orderBy: { date: 'desc' },
                    take: 30,
                });
                ctx.myAttendanceThisMonth = {
                    present: myAttendance.filter(a => a.status === 'PRESENT').length,
                    absent: myAttendance.filter(a => a.status === 'ABSENT').length,
                    late: myAttendance.filter(a => a.isLate).length,
                    totalHours: myAttendance.reduce((sum, a) => sum + (a.hours || 0), 0).toFixed(1),
                    records: myAttendance.slice(0, 5).map(a => ({
                        date: a.date.toDateString(),
                        status: a.status,
                        hours: a.hours?.toFixed(1),
                        isLate: a.isLate,
                    })),
                };
            }

            if ((role === 'ADMIN' || role === 'HR') && companyId) {
                const absentToday = await prisma.user.findMany({
                    where: {
                        companyId,
                        status: 'ACTIVE',
                        attendance: { none: { date: today } },
                    },
                    include: { profile: true },
                    take: 20,
                });
                ctx.absentToday = absentToday.map(u => ({
                    name: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email,
                    department: u.profile?.department,
                }));

                const lateToday = await prisma.attendance.findMany({
                    where: { date: today, isLate: true, user: { companyId } },
                    include: { user: { include: { profile: true } } },
                });
                ctx.lateArrivalsToday = lateToday.map(a => ({
                    name: a.user.profile ? `${a.user.profile.firstName} ${a.user.profile.lastName}` : a.user.email,
                    checkIn: a.checkIn?.toLocaleTimeString(),
                }));
            }
        }

        if (isAbout('employee', 'team', 'staff', 'people', 'how many', 'count', 'headcount') && companyId) {
            ctx.employeeStats = {
                total: await prisma.user.count({ where: { companyId, status: 'ACTIVE' } }),
                byDepartment: await prisma.profile.groupBy({
                    by: ['department'],
                    where: { companyId, department: { not: null } },
                    _count: { department: true },
                }),
            };

            if (role === 'MANAGER') {
                const team = await prisma.user.findMany({
                    where: { managerId: userId },
                    include: { profile: true },
                });
                ctx.myTeam = team.map(u => ({
                    name: u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email,
                    designation: u.profile?.designation,
                    department: u.profile?.department,
                }));
            }
        }

        if (isAbout('payslip', 'salary', 'pay', 'ctc', 'net pay', 'gross')) {
            if (role === 'EMPLOYEE') {
                const latestPayslip = await prisma.payslip.findFirst({
                    where: { userId },
                    orderBy: [{ year: 'desc' }, { month: 'desc' }],
                });
                if (latestPayslip) {
                    ctx.latestPayslip = {
                        month: latestPayslip.month,
                        year: latestPayslip.year,
                        gross: latestPayslip.gross,
                        net: latestPayslip.net,
                        workingDays: latestPayslip.workingDays,
                        presentDays: latestPayslip.presentDays,
                        status: latestPayslip.status,
                    };
                }
            }
        }

        if (isAbout('task', 'todo', 'pending', 'assigned')) {
            const tasks = await prisma.task.findMany({
                where: { userId, status: { not: 'DONE' } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });
            ctx.myPendingTasks = tasks.map(t => ({
                title: t.title,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate?.toDateString(),
            }));
        }

        if (isAbout('expense', 'claim', 'reimburs')) {
            const expenses = await prisma.expenseClaim.findMany({
                where: { userId },
                include: { category: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            });
            ctx.myExpenses = expenses.map(e => ({
                amount: e.amount,
                category: e.category.name,
                status: e.status,
                date: e.date.toDateString(),
            }));
        }
    } catch (err: any) {
        console.warn('Context gathering error:', err.message);
    }

    return ctx;
}

export const handleAiChat = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        // @ts-ignore
        const userId = req.user.userId;
        // @ts-ignore
        const role = req.user.role;
        // @ts-ignore
        const companyId = req.user.companyId ?? null;

        if (!message?.trim()) {
            return res.status(400).json({ reply: 'Please provide a message.' });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        const chatbotUrl = process.env.AI_SERVICE_URL?.replace('/ask', '') || 'https://citrux-hrms-chatbot.onrender.com';

        // ── PATH 1: OpenAI is configured ──────────────────────────────────────
        if (apiKey) {
            const context = await buildContext(userId, role, companyId, message);

            const systemPrompt = `You are an intelligent HR Assistant for Citrux HRMS. You help employees and HR managers with queries about leaves, attendance, payroll, team metrics, tasks, and expenses.

Today's date: ${new Date().toDateString()}
User role: ${role}
User name: ${context.requester?.name ?? 'User'}

You have access to the following real-time data fetched from the company database:
${JSON.stringify(context, null, 2)}

Guidelines:
- Answer directly and concisely using the data provided above.
- If the data is empty or unavailable for a question, say so honestly.
- For EMPLOYEE role: only share that user's own data.
- For ADMIN/HR role: you can share company-wide summaries.
- For MANAGER role: share own data + team data.
- Format numbers clearly (e.g. "8.5 hours", "3 days remaining").
- Use friendly, professional language.
- If a question is unrelated to HR/work, politely redirect to HRMS topics.`;

            const response = await axios.post(OPENAI_API_URL, {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                ],
                temperature: 0.4,
                max_tokens: 500,
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 20000,
            });

            const reply = response.data.choices?.[0]?.message?.content?.trim();
            return res.json({ reply: reply || "I couldn't generate a response. Please try again." });
        }

        // ── PATH 2: Fallback to Python deterministic chatbot ──────────────────
        try {
            // The Python chatbot uses a simple integer user_id based on role mapping
            const roleToId: Record<string, number> = { ADMIN: 1, HR: 1, MANAGER: 2, EMPLOYEE: 3 };
            const chatUserId = roleToId[role] ?? 3;

            const chatbotRes = await axios.post(`${chatbotUrl}/api/chat`, {
                user_id: chatUserId,
                message,
            }, { timeout: 15000 });

            const reply = chatbotRes.data?.response || "I couldn't understand that. Please try rephrasing.";
            return res.json({ reply });
        } catch (chatbotError: any) {
            console.warn('Python chatbot unavailable:', chatbotError.message);
            // Both paths failed — return a helpful static message
            return res.json({
                reply: "I'm currently running in limited mode. You can check your leaves and attendance directly from the dashboard. Please contact HR for further assistance."
            });
        }

    } catch (error: any) {
        console.error('AI Chat Error:', error.response?.data || error.message);
        const status = error.response?.status;
        if (status === 401) {
            return res.status(503).json({ reply: 'AI service authentication failed. Please contact your administrator.' });
        }
        if (status === 429) {
            return res.status(503).json({ reply: 'AI service is busy right now. Please try again in a moment.' });
        }
        return res.status(503).json({ reply: "I'm having trouble connecting right now. Please try again later." });
    }
};
