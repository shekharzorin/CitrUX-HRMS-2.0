import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Icon } from './ui/Icons';
import { useAuth } from '../contexts/AuthContext';

export const AiAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();
    
    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await api.post<{reply: string}>('/ai/chat', { message: userMessage });
            setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again later." }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!user) return null; // Only show for logged in users

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            {/* Chat Window */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-[400px] max-w-[calc(100vw-3rem)] h-[550px] max-h-[70vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-fade-in origin-bottom-right mb-4">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-center justify-between text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-sm border border-white/20">
                                <Icon name="campaign" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">HR Assistant</h3>
                                <span className="text-xs text-blue-100 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-400"></span> Online
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar relative">
                        {messages.length === 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                                <div className="w-16 h-16 mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-500">
                                    <Icon name="onboarding" size={32} />
                                </div>
                                <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">Hello, {user.profile?.firstName}!</p>
                                <p className="text-sm">I can help you with leaves, attendance, payroll, and metrics.</p>
                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                    {user.role === 'ADMIN' || user.role === 'HR' ? (
                                        <>
                                            <span onClick={() => setInput("Who is on leave today?")} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer hover:border-indigo-400 transition-colors">Who is on leave today?</span>
                                            <span onClick={() => setInput("Show employees with lowest attendance")} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer hover:border-indigo-400 transition-colors">Show lowest attendance</span>
                                        </>
                                    ) : (
                                        <>
                                            <span onClick={() => setInput("How many leaves do I have?")} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer hover:border-indigo-400 transition-colors">How many leaves do I have?</span>
                                            <span onClick={() => setInput("Show my attendance this month")} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs cursor-pointer hover:border-indigo-400 transition-colors">My attendance this month</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm whitespace-pre-wrap ${
                                    msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-br-sm' 
                                        : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce"></span>
                                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{animationDelay: '150ms'}}></span>
                                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" style={{animationDelay: '300ms'}}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                        <form onSubmit={handleSubmit} className="flex items-center relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything..."
                                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white placeholder-slate-400"
                                disabled={isTyping}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="absolute right-2 p-2 w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* floating button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-full shadow-xl shadow-indigo-500/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-indigo-500/50"
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                ) : (
                    <Icon name="campaign" size={28} />
                )}
            </button>
        </div>
    );
};
