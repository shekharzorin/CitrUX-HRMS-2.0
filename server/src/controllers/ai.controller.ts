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
        // @ts-ignore
        const companyId = req.user.companyId;

        if (!message) {
            return res.status(400).json({ reply: "Please provide a message." });
        }

        // 1. Gather minimal context for fallback & logging
        let contextData: any = {};
        const lowerMsg = message.toLowerCase();

        try {
            if (role === 'EMPLOYEE' || role === 'MANAGER') {
                if (lowerMsg.includes('leave')) {
                    contextData.myLeaves = await prisma.leaveBalance.findMany({ where: { userId, companyId } });
                }
                const profile = await prisma.profile.findUnique({ where: { userId } });
                contextData.userName = profile ? `${profile.firstName} ${profile.lastName}` : 'User';
            } else if (companyId) {
                // Admin/HR scoping
                if (lowerMsg.includes('total') || lowerMsg.includes('how many')) {
                    contextData.totalEmployeesCount = await prisma.user.count({ where: { companyId } });
                }
            }
        } catch (ctxError) {
            console.warn("Context gathering failed, continuing to AI service...");
        }

        // 2. Fetch AI Provider Preference
        let aiProvider = 'gemini';
        try {
            const aiProviderSetting = await prisma.systemSetting.findUnique({ where: { key: 'ai_provider' } });
            aiProvider = aiProviderSetting?.value || 'gemini';
        } catch (sError) {
            console.error("Settings fetch error:", sError);
        }

        // 3. Forward to AI Microservice
        try {
            const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000/ask';
            const aiServiceResponse = await axios.post(aiServiceUrl, {
                userId,
                companyId: companyId || null,
                message,
                provider: aiProvider
            }, { timeout: 15000 });

            return res.json({ 
                reply: aiServiceResponse.data.response,
                intent: aiServiceResponse.data.intent
            });
        } catch (aiError: any) {
            console.error("AI Microservice Error:", aiError.message);
            
            // Fallback to OpenAI if configured
            if (process.env.OPENAI_API_KEY) {
                const fallbackPrompt = `Role: ${role}. Question: ${message}. Context: ${JSON.stringify(contextData)}`;
                const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: fallbackPrompt }],
                    temperature: 0.3
                }, {
                    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
                    timeout: 10000
                });
                return res.json({ reply: response.data.choices[0].message.content });
            }

            return res.status(503).json({ 
                reply: "I'm having trouble connecting to the AI brain right now. Please try again in a few moments.",
                details: aiError.message
            });
        }
    } catch (error: any) {
        console.error("Global AI Chat Error:", error);
        res.status(500).json({ reply: "An internal server error occurred while processing your request." });
    }
};
