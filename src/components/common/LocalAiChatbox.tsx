import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { triggerHaptic } from '../../utils/haptics';
import {
  processAiQuery,
  buildAiPromptContext,
  AiDataContext
} from '../../utils/aiAssistantEngine';
import { generateGeminiResponse } from '../../utils/googleGeminiAi';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  Bubble,
  BubbleContent,
} from '@/components/ui/bubble';
import {
  Message as UIMessage,
  MessageAvatar,
  MessageContent,
} from '@/components/ui/message';
import {
  Bot,
  User,
  Send,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  Zap
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const LocalAiChatbox: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Chat messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I can help you with your timetable, tasks, student attendance, or marking absentees. Ask me anything!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Live Query DB Context
  const schedules = useLiveQuery(() => db.schedules.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const faculty = useLiveQuery(() => db.faculty.toArray()) || [];
  const periodConfigs = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray()) || [];
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const tasks = useLiveQuery(() => db.homeworkItems.toArray()) || [];
  const sessions = useLiveQuery(() => db.attendanceSessions.toArray()) || [];
  const settingsList = useLiveQuery(() => db.settings.toArray());
  const currentSettings = settingsList?.[0];
  const profilePhoto = currentSettings?.profilePhoto;

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputText('');
    setIsGenerating(true);
    triggerHaptic('light');

    const ctx: AiDataContext = {
      students,
      subjects,
      faculty,
      periodConfigs,
      schedules,
      sessions,
      tasks,
      settings: currentSettings,
      currentTime: new Date()
    };

    const isGeminiActive = !!currentSettings?.geminiApiKey?.trim() && currentSettings?.aiProvider !== 'local';

    try {
      let assistantReply: string | null = null;

      // 1. Online Google Gemini Cloud Intelligence
      if (isGeminiActive) {
        try {
          const systemContext = buildAiPromptContext(ctx);
          assistantReply = await generateGeminiResponse(
            text,
            systemContext,
            currentSettings!.geminiApiKey!,
            currentSettings?.geminiModel || 'gemini-2.0-flash',
            messages
          );
        } catch (geminiErr: any) {
          console.error('Google Gemini query failed:', geminiErr);
          const errDetail = geminiErr?.message || String(geminiErr);
          const localFallback = await processAiQuery(text, ctx, messages);
          if (localFallback) {
            assistantReply = `${localFallback}\n\n*(Note: Gemini cloud query error: ${errDetail})*`;
          } else {
            assistantReply = `**Google Gemini Error**: ${errDetail}\n\n*Please check your API key and connection under Settings > Google Gemini.*`;
          }
        }
      } else {
        // 2. Deterministic Local Real-Time Assistant Engine with conversation history
        assistantReply = await processAiQuery(text, ctx, messages);
      }

      if (assistantReply) {
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'assistant',
            text: assistantReply!,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        triggerHaptic('success');
      } else {
        // Conversational fallback with context
        const pendingCount = tasks.filter(t => !t.isCompleted).length;
        const subCount = subjects.length;
        setMessages(prev => [
          ...prev,
          {
            id: Math.random().toString(),
            sender: 'assistant',
            text: `I'm your **On-Device Class Assistant**! While running offline without an LLM connection, I directly query your real-time database and academic concepts:

• **Timetable**: Ask *"What's my schedule today?"* or *"Next class"*
• **Tasks & Exams**: Ask *"Show pending tasks"* (${pendingCount} pending) or ask *"What is that?"* about any task
• **Academic Concepts**: Ask *"What is cantilever?"*, *"Explain bending moment"*, or *"Study guide for ${subjects[0]?.code || 'MEC207'}"*
• **Attendance**: Ask *"Who has low attendance?"* or *"Absentees [reg numbers]"*

*(Tip: In Settings > AI, you can connect your Google Gemini API Key for open-ended conversational intelligence!)*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error('AI assistant query error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'assistant',
          text: `I'm here to help! Feel free to ask about today's timetable, current class, student attendance, or mark absentees.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => {
            triggerHaptic('medium');
            setIsOpen(true);
          }}
          aria-label="Open Smart AI Assistant"
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-4 md:bottom-8 md:right-8 z-40 flex items-center justify-center gap-2 p-3 sm:px-4 sm:py-3 rounded-2xl sm:rounded-full bg-neutral-900/95 hover:bg-neutral-800 dark:bg-[#1A1A1A]/95 dark:hover:bg-[#262626] text-white font-bold text-xs shadow-2xl border border-neutral-700/80 dark:border-neutral-700 backdrop-blur-xl hover:scale-105 active:scale-95 transition-all duration-200 group"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5 h-5 sm:w-4 sm:h-4 text-white group-hover:text-[var(--accent-tertiary)] transition-colors" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-tertiary)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-tertiary)]"></span>
            </span>
          </div>
          <span className="hidden sm:inline tracking-wide font-bold">Smart AI</span>
          <Sparkles className="hidden sm:block w-3.5 h-3.5 text-[var(--accent-tertiary)] shrink-0" />
        </button>
      )}

      {/* Local AI Chatbox Drawer Panel */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className={`fixed z-[9999] transition-all duration-300 flex flex-col bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-3xl overflow-hidden ${
            isExpanded
              ? 'inset-3 sm:inset-6 top-[max(1rem,env(safe-area-inset-top,1rem))] pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))]'
              : 'bottom-20 sm:bottom-6 right-3 sm:right-6 w-[380px] max-w-[calc(100vw-1.5rem)] h-[520px] max-h-[calc(100vh-6.5rem)]'
          }`}
        >
          {/* Header */}
          <div className="bg-neutral-900 dark:bg-[#0A0A0A] text-white p-4 flex items-center justify-between gap-3 shrink-0 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-neutral-800 dark:bg-[#262626] flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                  <span>Class Assistant</span>
                  {!!currentSettings?.geminiApiKey?.trim() && currentSettings?.aiProvider !== 'local' ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ONLINE
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-neutral-700/60 text-neutral-300 border border-neutral-600/40">
                      OFFLINE
                    </span>
                  )}
                </h3>
                <span className="text-[10px] text-neutral-400 font-medium block">
                  {!!currentSettings?.geminiApiKey?.trim() && currentSettings?.aiProvider !== 'local' ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 inline" />
                      Google Gemini ({currentSettings?.geminiModel || 'Flash'})
                    </span>
                  ) : (
                    'On-Device Academic Engine'
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="p-2.5 bg-neutral-50 dark:bg-[#262626]/60 border-b border-neutral-200/60 dark:border-neutral-800 flex gap-2 overflow-x-auto shrink-0">
            <button
              onClick={() => handleSendMessage("What is my next class?")}
              className="px-3 py-1 rounded-full bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 shrink-0 hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
            >
              Next Class?
            </button>
            <button
              onClick={() => handleSendMessage("Who has attendance below 75%?")}
              className="px-3 py-1 rounded-full bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 shrink-0 hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
            >
              Attendance &lt;75%
            </button>
            <button
              onClick={() => handleSendMessage("Show pending tasks and exam reminders")}
              className="px-3 py-1 rounded-full bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 shrink-0 hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
            >
              Pending Tasks
            </button>
            <button
              onClick={() => handleSendMessage("Show today's timetable")}
              className="px-3 py-1 rounded-full bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200 shrink-0 hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
            >
              Today's Schedule
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map(msg => (
              <UIMessage
                key={msg.id}
                align={msg.sender === 'user' ? 'end' : 'start'}
              >
                <MessageAvatar>
                  <Avatar className="h-7 w-7 rounded-full overflow-hidden shrink-0">
                    {msg.sender === 'assistant' ? (
                      <AvatarFallback className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">
                        <Bot className="w-3.5 h-3.5" />
                      </AvatarFallback>
                    ) : profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="You"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="bg-[var(--accent-tertiary)] text-white font-bold">
                        <User className="w-3.5 h-3.5 text-white" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </MessageAvatar>

                <MessageContent>
                  <Bubble variant={msg.sender === 'user' ? 'tertiary' : 'muted'}>
                    <BubbleContent>
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                      <span
                        className={`block text-[9px] mt-1 font-mono ${
                          msg.sender === 'user' ? 'text-white/70 text-right' : 'text-neutral-400'
                        }`}
                      >
                        {msg.timestamp}
                      </span>
                    </BubbleContent>
                  </Bubble>
                </MessageContent>
              </UIMessage>
            ))}
            {isGenerating && (
              <UIMessage align="start">
                <MessageAvatar>
                  <Avatar className="h-7 w-7 rounded-full overflow-hidden shrink-0">
                    <AvatarFallback className="bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900">
                      <Bot className="w-3.5 h-3.5 animate-pulse" />
                    </AvatarFallback>
                  </Avatar>
                </MessageAvatar>
                <MessageContent>
                  <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-750 space-y-2.5 max-w-[260px]">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                      <Sparkles className="w-3 h-3 text-[var(--accent-tertiary)] animate-spin shrink-0" />
                      <span>{currentSettings?.aiProvider === 'gemini' && currentSettings?.geminiApiKey ? 'Gemini is processing...' : 'Analyzing class context...'}</span>
                    </div>
                    <Skeleton className="h-3 w-44" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </MessageContent>
              </UIMessage>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-[#171717] border-t border-neutral-200 dark:border-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder='Ask about next class, attendance, or add tasks...'
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSendMessage();
                }}
                disabled={isGenerating}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent-tertiary-subtle)] focus:border-[var(--accent-tertiary)]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isGenerating}
                className="p-2.5 rounded-2xl bg-[var(--accent-tertiary)] hover:opacity-90 text-white font-bold disabled:opacity-40 transition-all active:scale-95 shadow-md shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
