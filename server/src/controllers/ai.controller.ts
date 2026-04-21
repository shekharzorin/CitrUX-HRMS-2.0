import { Request, Response } from 'express';
import { prisma } from '../db';
import axios from 'axios';

export const handleAiChat = async (req: Request, res: Response) => {
    try {
        const { message } = req.body;
        // @ts-ignore
        const userId = req.user.userId;
        // @ts-ignore
        const role = req.user.role;

        if (!message) {
            return res.status(400).json({ reply: "Please provide a message." });
        }

        // 1. Fetch relevant user/company context structurally
        let contextData: any = {};
        const lowerMsg = message.toLowerCase();

        // 2. Scope context based on Role requirements
        if (role === 'EMPLOYEE' || role === 'MANAGER') {
            if (lowerMsg.includes('leave') || lowerMsg.includes('holiday')) {
                contextData.myLeaves = await prisma.leaveBalance.findMany({ where: { userId } });
                contextData.myRecentRequests = await prisma.leaveRequest.findMany({ where: { userId }, take: 5, orderBy: { startDate: 'desc' } });
            }
            if (lowerMsg.includes('attendance') || lowerMsg.includes('present') || lowerMsg.includes('absent')) {
                 const today = new Date();
                 const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                 contextData.myAttendanceThisMonth = await prisma.attendance.findMany({ where: { userId, date: { gte: firstDay } }, select: { date: true, status: true, checkIn: true, checkOut: true } });
            }
            if (lowerMsg.includes('payslip') || lowerMsg.includes('salary') || lowerMsg.includes('pay')) {
                 contextData.myPayslips = await prisma.payslip.findMany({ where: { userId }, take: 3, orderBy: { month: 'desc' }, select: { month: true, year: true, net: true, url: true }});
            }
            
            // Add user's basic profile details
            const userProfile = await prisma.profile.findUnique({ where: { userId } });
            contextData.myName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "User";
        }

        if (role === 'ADMIN' || role === 'HR' || role === 'SUPER_ADMIN') {
            if (lowerMsg.includes('lowest attendance') || lowerMsg.includes('attendance') || lowerMsg.includes('absent')) {
                const users = await prisma.user.findMany({
                    select: { 
                        id: true, 
                        profile: { select: { firstName: true, lastName: true } }, 
                        _count: { select: { attendance: { where: { status: 'PRESENT' } } } } 
                    }
                });
                contextData.lowestAttendanceEmployees = users
                    .map(u => ({ name: `${u.profile?.firstName} ${u.profile?.lastName}`, presentCount: u._count.attendance }))
                    .sort((a,b) => a.presentCount - b.presentCount)
                    .slice(0, 5);
            }
            if (lowerMsg.includes('leave') || lowerMsg.includes('out') || lowerMsg.includes('today')) {
                const today = new Date();
                today.setHours(0,0,0,0);
                const nextDay = new Date(today);
                nextDay.setDate(nextDay.getDate() + 1);
                const onLeave = await prisma.leaveRequest.findMany({
                    where: { 
                        status: 'APPROVED', 
                        startDate: { lte: nextDay }, 
                        endDate: { gte: today }
                    },
                    include: { user: { include: { profile: true } }, leaveType: true }
                });
                contextData.employeesOnLeaveToday = onLeave.map(l => ({
                    name: `${l.user.profile?.firstName} ${l.user.profile?.lastName}`,
                    type: l.leaveType?.name,
                    endDate: l.endDate
                }));
            }
            if (lowerMsg.includes('total') || lowerMsg.includes('how many employees')) {
                contextData.totalEmployeesCount = await prisma.user.count();
            }
        }

        // 3. Build Prompt
        const prompt = `You are a dynamic AI HR Assistant built into the Citrux HRMS directly.
User Information: 
- Role: ${role}
- User's Question: "${message}"

Here is the precise, real-time database JSON context derived specifically for this user's question, accounting for their permissions:
${JSON.stringify(contextData)}

Instructions:
1. Answer the user's question accurately using ONLY this JSON context.
2. If the user asks for a document link (e.g., payslip), provide the URL if it exists in the context.
3. Be friendly, concise, and highly professional like an enterprise AI.
4. Do NOT make up information. If the JSON is empty or lacks the answer, politely say "I don't have that information right now."
5. If addressing an admin/HR, provide clear summaries of the asked data.
6. Keep the response clean and easy to read.`;

        // 4. Call LLM API (OpenAI)
        if (!process.env.OPENAI_API_KEY) {
            return res.json({ 
                reply: `(Demo Mode: No OPENAI_API_KEY found)\n\nHello! I am your AI Assistant. Based on your request as a ${role}, here is the raw data I pulled from the HRMS database:\n\n${JSON.stringify(contextData, null, 2)}`
            });
        }

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 300
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ reply: response.data.choices[0].message.content });
    } catch (error) {
        console.error("AI Assistant Error:", error);
        res.status(500).json({ reply: "I encountered an error connecting to my neural net. Please try again later." });
    }
};
