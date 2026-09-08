import React from 'react';
import { X, History, MessageSquare, Trash2, Clock } from 'lucide-react';
import type { AiSession } from '../../types/ai';

interface SessionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: AiSession[];
  onSelectSession: (session: AiSession) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const SessionHistoryDrawer: React.FC<SessionHistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onDeleteSession,
}) => {
  if (!isOpen) return null;

  const mockSessions: AiSession[] = sessions.length > 0 ? sessions : [
    {
      id: 'sess-1',
      title: 'March Drawdown Investigation',
      mode: 'trade_analysis',
      created_at: 'Today, 2:45 PM',
      dataset_name: 'my_trades_august2026.csv',
      trade_count: 248,
      messages: [],
    },
    {
      id: 'sess-2',
      title: 'August Trading Performance Review',
      mode: 'trade_analysis',
      created_at: 'Yesterday',
      dataset_name: 'my_trades_august2026.csv',
      trade_count: 248,
      messages: [],
    },
    {
      id: 'sess-3',
      title: 'NIFTY 50 Momentum Core Study',
      mode: 'research',
      created_at: 'Last Week',
      dataset_name: 'NIFTY 50 2018–2026',
      messages: [],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-base">AI Research History</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sessions List */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 font-sans text-xs">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider px-1">Saved Sessions</div>
          {mockSessions.map((sess) => (
            <div
              key={sess.id}
              onClick={() => {
                onSelectSession(sess);
                onClose();
              }}
              className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-800/40 cursor-pointer transition-all space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                  <h4 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors text-xs">{sess.title}</h4>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(sess.id);
                  }}
                  className="text-slate-500 hover:text-rose-400 p-1 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                <span className="truncate max-w-[200px]">📄 {sess.dataset_name}</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  {sess.created_at}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-center font-mono text-[11px] text-slate-400">
          Sessions preserve analysis context, datasets & metrics.
        </div>
      </div>
    </div>
  );
};
