import { Request, Response } from 'express';
import { prisma } from '../db';
import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ─────────────────────────────────────────────────────────────────────────────
//  INTENT DETECTION  (ported from app/nlp/intent.py)
// ─────────────────────────────────────────────────────────────────────────────
type Intent =
    | 'leave_query'
    | 'team_leave_query'
    | 'work_hours_query'
    | 'attendance_query'
    | 'task_query'
    | 'holiday_query'
    | 'salary_query'
    | 'greeting'
    | 'unknown_query';

function detectIntent(message: string): Intent {
    const m = message.toLowerCase();

    if (/\b(hi|hello|hey|good morning|good afternoon|howdy)\b/.test(m)) return 'greeting';
    if (/team.*(leave|absent|off)/.test(m) || /who.*(leave|absent|off)/.test(m)) return 'team_leave_query';
    if (/\b(hours|how long|how much.*work|time.*work|worked)\b/.test(m)) return 'work_hours_query';
    if (/\b(leave|vacation|day off|days off|balance|annual|sick|casual)\b/.test(m)) return 'leave_query';
    if (/\b(task|todo|pending|assigned|to-do|to do)\b/.test(m)) return 'task_query';
    if (/\b(holiday|public holiday|upcoming.*off|next.*off)\b/.test(m)) return 'holiday_query';
    if (/\b(salary|payslip|pay slip|ctc|net pay|gross|payday|payroll)\b/.test(m)) return 'salary_query';
    if (/\b(attendance|present|absent|late|check.?in|clock.?in|login|log.?in)\b/.test(m)) return 'attendance_query';

    return 'unknown_query';
}

// ─────────────────────────────────────────────────────────────────────────────
//  INTENT HANDLERS  (real Prisma data)
// ─────────────────────────────────────────────────────────────────────────────
async function handleGreeting(userId: string): Promise<string> {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    const name = profile?.firstName || 'there';
    const hour = new Date().getHours();
    const tod = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return `${tod}, ${name}! 👋 I'm your HR assistant. I can help you with leaves, attendance, tasks, holidays, and salary. What would you like to know?`;
}

async function handleLeaveQuery(userId: string): Promise<string> {
    const balances = await prisma.leaveBalance.findMany({
        where: { userId },
        include: { leaveType: true },
    });

    if (!balances.length) {
        return "I couldn't find any leave balance information for your account. Please contact HR.";
    }

    const lines = balances.map(b =>
        `• **${b.leaveType.name}**: ${b.balance} day${b.balance !== 1 ? 's' : ''} remaining (${b.used} used of ${b.leaveType.daysPerYear})`
    );

    return `Here are your current leave balances:\n${lines.join('\n')}`;
}

async function handleTeamLeaveQuery(userId: string, role: string, companyId: string | null): Promise<string> {
    if (role === 'EMPLOYEE') {
        return "Only managers and HR can view team leave information. You can check your own leave balance by asking 'How many leaves do I have?'";
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause: any = {
        status: 'APPROVED',
        startDate: { lte: new Date() },
        endDate: { gte: today },
    };

    if (companyId) whereClause.user = { companyId };
    if (role === 'MANAGER') whereClause.user = { ...whereClause.user, managerId: userId };

    const onLeave = await prisma.leaveRequest.findMany({
        where: whereClause,
        include: { user: { include: { profile: true } }, leaveType: true },
    });

    if (!onLeave.length) return "No one is on approved leave today. 🎉";

    const lines = onLeave.map(l => {
        const name = l.user.profile
            ? `${l.user.profile.firstName} ${l.user.profile.lastName}`
            : l.user.email;
        return `• **${name}** — ${l.leaveType.name} (until ${l.endDate.toDateString()})`;
    });

    return `**${onLeave.length} employee${onLeave.length > 1 ? 's' : ''} on leave today:**\n${lines.join('\n')}`;
}

async function handleWorkHoursQuery(userId: string): Promise<string> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const records = await prisma.attendance.findMany({
        where: { userId, date: { gte: startOfMonth } },
        orderBy: { date: 'desc' },
    });

    if (!records.length) return "No attendance records found for this month. Have you clocked in yet today?";

    const totalHours = records.reduce((sum, r) => sum + (r.hours || 0), 0);
    const present = records.filter(r => r.status === 'PRESENT').length;

    return `📊 **Your attendance this month:**\n• Present: ${present} day${present !== 1 ? 's' : ''}\n• Total hours worked: ${totalHours.toFixed(1)} hrs\n• Average per day: ${(totalHours / Math.max(present, 1)).toFixed(1)} hrs`;
}

async function handleAttendanceQuery(userId: string): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayRecord = await prisma.attendance.findFirst({
        where: {
            userId,
            date: { gte: today, lt: tomorrow },
        },
        include: { breaks: true },
    });

    if (!todayRecord) {
        return "You haven't clocked in today yet. Use the Attendance widget on the dashboard to punch in.";
    }

    const checkIn = todayRecord.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
    const checkOut = todayRecord.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still working';
    const hours = todayRecord.hours ? `${Number(todayRecord.hours).toFixed(1)} hrs` : 'In progress';
    const breaks = todayRecord.breaks?.length || 0;

    return `📍 **Today's attendance:**\n• Clock In: ${checkIn}\n• Clock Out: ${checkOut}\n• Hours: ${hours}\n• Breaks taken: ${breaks}`;
}

async function handleTaskQuery(userId: string): Promise<string> {
    const tasks = await prisma.task.findMany({
        where: { userId, status: { not: 'DONE' } },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    if (!tasks.length) return "✅ You have no pending tasks. You're all caught up!";

    const lines = tasks.slice(0, 5).map(t => {
        const due = t.dueDate ? ` (due ${new Date(t.dueDate).toDateString()})` : '';
        const priority = t.priority ? ` [${t.priority}]` : '';
        return `• ${t.title}${priority}${due}`;
    });

    const more = tasks.length > 5 ? `\n...and ${tasks.length - 5} more.` : '';
    return `📋 **You have ${tasks.length} pending task${tasks.length > 1 ? 's' : ''}:**\n${lines.join('\n')}${more}`;
}

async function handleHolidayQuery(companyId: string | null): Promise<string> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const whereClause: any = { date: { gte: today } };
    if (companyId) whereClause.companyId = companyId;

    const holidays = await prisma.holiday.findMany({
        where: whereClause,
        orderBy: { date: 'asc' },
        take: 3,
    });

    if (!holidays.length) return "No upcoming holidays are scheduled in the system. Check with HR for the holiday calendar.";

    const lines = holidays.map(h => {
        const daysLeft = Math.ceil((new Date(h.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const label = daysLeft === 0 ? '🎉 Today!' : daysLeft === 1 ? 'Tomorrow' : `in ${daysLeft} days`;
        return `• **${h.name}** — ${new Date(h.date).toDateString()} (${label})`;
    });

    return `🗓️ **Upcoming holidays:**\n${lines.join('\n')}`;
}

async function handleSalaryQuery(userId: string): Promise<string> {
    const payslip = await prisma.payslip.findFirst({
        where: { userId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    if (!payslip) return "No payslip records found. Contact HR if you believe this is an error.";

    const monthName = new Date(payslip.year, payslip.month - 1, 1).toLocaleString('default', { month: 'long' });
    return `💰 **Latest payslip (${monthName} ${payslip.year}):**\n• Gross Pay: ₹${payslip.gross?.toLocaleString() || 'N/A'}\n• Net Pay: ₹${payslip.net?.toLocaleString() || 'N/A'}\n• Working Days: ${payslip.workingDays || 'N/A'}\n• Present Days: ${payslip.presentDays || 'N/A'}\n• Status: ${payslip.status}`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONTEXT BUILDER  (for OpenAI path)
// ─────────────────────────────────────────────────────────────────────────────
async function buildContext(userId: string, role: string, companyId: string | null, message: string) {
    const lower = message.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ctx: Record<string, any> = {};

    const isAbout = (...keywords: string[]) => keywords.some(k => lower.includes(k));

    try {
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
            }

            if ((role === 'ADMIN' || role === 'HR' || role === 'MANAGER') && companyId) {
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
                    leaveType: l.leaveType.name,
                    from: l.startDate.toDateString(),
                    to: l.endDate.toDateString(),
                }));
            }
        }

        if (isAbout('attendance', 'present', 'absent', 'late', 'check in', 'clock')) {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
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
            };
        }

        if (isAbout('task', 'todo', 'pending', 'assigned')) {
            const tasks = await prisma.task.findMany({
                where: { userId, status: { not: 'DONE' } },
                take: 10,
            });
            ctx.myPendingTasks = tasks.map(t => ({
                title: t.title,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate?.toDateString(),
            }));
        }

        if (isAbout('payslip', 'salary', 'pay', 'ctc')) {
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
                    status: latestPayslip.status,
                };
            }
        }
    } catch (err: any) {
        console.warn('Context gathering error:', err.message);
    }

    return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
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

        // ── PATH 1: OpenAI is configured ──────────────────────────────────────
        if (apiKey) {
            const context = await buildContext(userId, role, companyId, message);
            const systemPrompt = `You are an intelligent HR Assistant for Citrux HRMS. Today's date: ${new Date().toDateString()}. User role: ${role}. User: ${context.requester?.name ?? 'User'}.\n\nReal-time data:\n${JSON.stringify(context, null, 2)}\n\nBe concise, friendly, and professional. Only answer HR-related questions.`;

            const response = await axios.post(OPENAI_API_URL, {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message },
                ],
                temperature: 0.4,
                max_tokens: 500,
            }, {
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                timeout: 20000,
            });

            const reply = response.data.choices?.[0]?.message?.content?.trim();
            return res.json({ reply: reply || "I couldn't generate a response. Please try again." });
        }

        // ── PATH 2: Built-in intent-based engine (no external API needed) ─────
        const intent = detectIntent(message);

        let reply: string;
        try {
            switch (intent) {
                case 'greeting':
                    reply = await handleGreeting(userId);
                    break;
                case 'leave_query':
                    reply = await handleLeaveQuery(userId);
                    break;
                case 'team_leave_query':
                    reply = await handleTeamLeaveQuery(userId, role, companyId);
                    break;
                case 'work_hours_query':
                    reply = await handleWorkHoursQuery(userId);
                    break;
                case 'attendance_query':
                    reply = await handleAttendanceQuery(userId);
                    break;
                case 'task_query':
                    reply = await handleTaskQuery(userId);
                    break;
                case 'holiday_query':
                    reply = await handleHolidayQuery(companyId);
                    break;
                case 'salary_query':
                    reply = await handleSalaryQuery(userId);
                    break;
                default:
                    reply = "I can help you with:\n• 🏖️ Leave balances & team leave\n• ⏰ Attendance & work hours\n• 📋 Pending tasks\n• 🗓️ Upcoming holidays\n• 💰 Salary & payslips\n\nTry asking something like 'How many leaves do I have?' or 'Show my attendance this month'.";
            }
        } catch (dbError: any) {
            console.error('DB error in intent handler:', dbError.message);
            reply = "I had trouble fetching your data. Please try again in a moment.";
        }

        return res.json({ reply });

    } catch (error: any) {
        console.error('AI Chat Error:', error.message);
        return res.status(500).json({ reply: "Something went wrong. Please try again." });
    }
};
