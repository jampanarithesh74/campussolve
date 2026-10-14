import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  UserCheck,
  Calendar,
  Layers,
  ChevronRight,
  Loader2,
  Maximize2,
  Minimize2,
  Shield,
  HelpCircle
} from 'lucide-react';
import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableEntry,
  UserRole
} from '../../types';
import { AIMessage, StructuredAction } from '../../types/ai';
import { sendAIMessage } from '../../lib/aiService';

interface CampusSolveAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  userInfo: {
    id: string;
    email: string;
    displayName: string;
    batchId?: string;
    facultyId?: string;
  };
  dataset: {
    entries: TimetableEntry[];
    faculty: Faculty[];
    batches: Batch[];
    rooms: Room[];
    subjects: Subject[];
    availabilities: FacultyAvailability[];
  };
  onApplyGeneratedSchedule?: (entries: TimetableEntry[]) => void;
  onTriggerPrintExport?: () => void;
}

export const CampusSolveAIAssistant: React.FC<CampusSolveAIAssistantProps> = ({
  isOpen,
  onClose,
  role,
  userInfo,
  dataset,
  onApplyGeneratedSchedule,
  onTriggerPrintExport
}) => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message based on user role
  useEffect(() => {
    if (messages.length === 0) {
      let welcomeContent = '';
      let initialSuggestions: string[] = [];

      if (role === 'admin') {
        welcomeContent = `👋 **Hello ${userInfo.displayName || 'Administrator'}!**\n\nI am the **CampusSolve AI Assistant**, your intelligent co-pilot for academic scheduling and resource optimization.\n\nI can analyze hard constraint violations, calculate timetable quality scores, recommend room allocations, and execute deterministic automated scheduling runs.`;
        initialSuggestions = [
          'Check timetable for any conflicts',
          'Explain timetable quality score',
          'Find available rooms on Monday 10:00',
          'Show faculty workload distribution',
          'Run automated schedule generator'
        ];
      } else if (role === 'teacher' || role === 'faculty') {
        welcomeContent = `👋 **Hello ${userInfo.displayName || 'Faculty Member'}!**\n\nI am your personal **CampusSolve Teaching Assistant**. I can help you monitor your weekly lecture hours, check upcoming classrooms, look up free periods, and answer questions about your assigned student cohorts.`;
        initialSuggestions = [
          'When is my next class?',
          'How many hours am I teaching this week?',
          'Show my schedule for today',
          'Show my free teaching periods',
          'Print my teaching schedule'
        ];
      } else {
        welcomeContent = `👋 **Hello ${userInfo.displayName || 'Student'}!**\n\nI am your **CampusSolve Timetable Guide**. Ask me about lecture timings, classroom locations, lab sessions, and your cohort's free periods.`;
        initialSuggestions = [
          'What classes do I have today?',
          'When is Data Structures lecture?',
          'Which room is my next lab in?',
          'Show my free periods on Friday',
          'Download my timetable'
        ];
      }

      setMessages([
        {
          id: `welcome_${Date.now()}`,
          role: 'assistant',
          content: welcomeContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          intent: 'GENERAL_QUERY',
          suggestedFollowUps: initialSuggestions
        }
      ]);
    }
  }, [role, userInfo, messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: AIMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await sendAIMessage(
        text,
        [...messages, userMsg],
        role,
        userInfo,
        dataset
      );
      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Communication Notice:** Unable to reach assistant server. You can retry your question or run constraint validation directly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        suggestedFollowUps: ['Retry previous query', 'Check conflicts in timetable']
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleExecuteAction = (action: StructuredAction, messageId: string) => {
    setExecutingActionId(action.id);

    setTimeout(() => {
      if (action.type === 'GENERATE_SCHEDULE' && action.payload?.scheduledEntries) {
        if (onApplyGeneratedSchedule) {
          onApplyGeneratedSchedule(action.payload.scheduledEntries);
        }
      } else if (action.type === 'TRIGGER_EXPORT') {
        if (onTriggerPrintExport) {
          onTriggerPrintExport();
        }
      }

      // Mark action as executed in message
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.action) {
            return {
              ...msg,
              action: { ...msg.action, isExecuted: true }
            };
          }
          return msg;
        })
      );
      setExecutingActionId(null);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 no-print ${
        isExpanded
          ? 'w-[92vw] sm:w-[680px] h-[85vh] max-h-[800px]'
          : 'w-[94vw] sm:w-[440px] h-[600px] max-h-[90vh]'
      }`}
    >
      {/* Top Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight">CampusSolve AI</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-200 border border-blue-400/30">
                {role}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate max-w-[220px] sm:max-w-[280px]">
              {role === 'admin'
                ? 'Master Scheduling Intelligence'
                : role === 'teacher' || role === 'faculty'
                ? 'Faculty Workload & Timetable Assistant'
                : 'Student Schedule Guide'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Role Protection Banner */}
      <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5 truncate">
          <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="truncate">
            Deterministic Engine: <strong>{dataset.entries.length} sessions</strong> •{' '}
            <strong>{dataset.rooms.length} rooms</strong> •{' '}
            <strong>{dataset.faculty.length} faculty</strong>
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono shrink-0">OpenAI Layer</span>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : msg.isError
                  ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
              }`}
            >
              {/* Message Content formatted with Markdown-like blocks */}
              <div className="space-y-2 whitespace-pre-wrap">
                {msg.content.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx}>
                    {paragraph.split('\n').map((line, lIdx) => (
                      <span key={lIdx} className="block">
                        {line.startsWith('- ') ? (
                          <span className="pl-1">
                            • {line.slice(2).replace(/\*\*(.*?)\*\*/g, '$1')}
                          </span>
                        ) : line.startsWith('**') ? (
                          <strong className="font-semibold text-slate-900">
                            {line.replace(/\*\*/g, '')}
                          </strong>
                        ) : (
                          line
                        )}
                      </span>
                    ))}
                  </p>
                ))}
              </div>

              {/* Quality Score Card if attached */}
              {msg.qualityMetrics && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-[11px]">Timetable Quality</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-xs ${
                        msg.qualityMetrics.overallScore >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {msg.qualityMetrics.overallScore} / 100
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {msg.qualityMetrics.metrics.map((m, mIdx) => (
                      <div key={mIdx} className="p-1.5 rounded bg-white border border-slate-200">
                        <span className="text-slate-500 block truncate">{m.label}</span>
                        <span className="font-bold text-slate-800">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Structured Action Confirmation Card */}
              {msg.action && (
                <div className="mt-3 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>{msg.action.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">{msg.action.summary}</p>
                  {msg.action.impact && (
                    <p className="text-[10px] text-blue-800 bg-blue-100/50 p-1.5 rounded border border-blue-200/60">
                      <strong>Impact:</strong> {msg.action.impact}
                    </p>
                  )}

                  <div className="pt-1 flex items-center gap-2">
                    {msg.action.isExecuted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-md border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Action Executed Successfully
                      </span>
                    ) : (
                      <button
                        onClick={() => handleExecuteAction(msg.action!, msg.id)}
                        disabled={executingActionId === msg.action.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {executingActionId === msg.action.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirm & Apply
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div
                className={`text-[9px] mt-1.5 flex items-center justify-end ${
                  msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                <span>{msg.timestamp}</span>
              </div>
            </div>

            {/* Suggested Follow-Ups */}
            {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                {msg.suggestedFollowUps.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => handleSendMessage(prompt)}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium transition-all cursor-pointer shadow-2xs hover:border-slate-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs py-2 px-3 bg-white rounded-xl border border-slate-200 w-fit">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Analyzing timetable constraints with AI intelligence...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Starters (if conversation is fresh) */}
      {messages.length <= 1 && (
        <div className="p-2.5 bg-slate-100/70 border-t border-slate-200">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-slate-400" />
            <span>Recommended for {role}:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(role === 'admin'
              ? [
                  'Check timetable conflicts',
                  'Explain quality score',
                  'Find free rooms Mon 10:00',
                  'Show faculty workload'
                ]
              : role === 'teacher'
              ? [
                  'When is my next class?',
                  'My teaching hours',
                  'Free periods today',
                  'Print schedule'
                ]
              : [
                  'Classes today',
                  'When is Data Structures?',
                  'Next lab location',
                  'Free periods Friday'
                ]
            ).map((starter, sIdx) => (
              <button
                key={sIdx}
                onClick={() => handleSendMessage(starter)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 font-medium transition-all cursor-pointer shadow-2xs"
              >
                {starter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={
            role === 'admin'
              ? 'Ask about timetable generation, conflicts, rooms, or quality...'
              : role === 'teacher'
              ? 'Ask about your schedule, workload hours, or free periods...'
              : 'Ask about class timings, room locations, or subjects...'
          }
          className="flex-1 text-xs text-slate-900 placeholder:text-slate-400 px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all bg-slate-50/50"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim() || isLoading}
          className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer shrink-0"
          title="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
