import { Layout } from '@/components/Layout';
import { mockPsychologyEntries } from '@/mock/psychology';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function PsychologyPage() {
  const totalImpulse = mockPsychologyEntries.reduce((sum, e) => sum + e.impulseTradesCount, 0);
  const avgMood = mockPsychologyEntries.reduce((sum, e) => sum + e.moodBefore, 0) / mockPsychologyEntries.length;

  return (
    <Layout title="Psychology / Control">
      <div className="space-y-5 max-w-3xl">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Avg Mood (Before)', value: `${avgMood.toFixed(1)} / 10`, color: avgMood >= 7 ? 'text-emerald-400' : avgMood >= 5 ? 'text-amber-400' : 'text-red-400' },
            { label: 'Impulse Trades (Total)', value: String(totalImpulse), color: totalImpulse > 0 ? 'text-amber-400' : 'text-emerald-400' },
            { label: 'Sessions Logged', value: String(mockPsychologyEntries.length), color: 'text-white' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-lg border border-slate-800 bg-card p-4" data-testid={`psych-summary-${label.toLowerCase().replace(/\s/g, '-')}`}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Session entries */}
        {mockPsychologyEntries.map(entry => (
          <div
            key={entry.id}
            className={`rounded-lg border bg-card p-5 ${entry.impulseTradesCount > 0 ? 'border-amber-800' : 'border-slate-800'}`}
            data-testid={`psych-entry-${entry.id}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">
                    Mood before: <span className={`font-bold ${entry.moodBefore >= 7 ? 'text-emerald-400' : entry.moodBefore >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{entry.moodBefore}/10</span>
                  </span>
                  {entry.moodAfter !== undefined && (
                    <span className="text-xs text-slate-500">
                      After: <span className={`font-bold ${entry.moodAfter >= 7 ? 'text-emerald-400' : entry.moodAfter >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{entry.moodAfter}/10</span>
                    </span>
                  )}
                  {entry.impulseTradesCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      {entry.impulseTradesCount} impulse trade{entry.impulseTradesCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Pre-flight checklist */}
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pre-flight Checklist</p>
              <div className="space-y-1.5">
                {entry.preFlightChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm" data-testid={`checklist-item-${entry.id}-${i}`}>
                    {item.checked ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span className={item.checked ? 'text-slate-300' : 'text-slate-500 line-through'}>{item.item}</span>
                  </div>
                ))}
              </div>
            </div>

            {entry.reflection && (
              <div className="pt-3 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reflection</p>
                <p className="text-sm text-slate-300 italic">"{entry.reflection}"</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}
