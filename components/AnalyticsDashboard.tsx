
import React from 'react';
import { SentimentData } from '../types';
import { Activity, Users, Smile, BarChart2, TrendingUp, AlertOctagon, Lightbulb, CheckCircle2 } from 'lucide-react';

interface Props {
    data: SentimentData | null | undefined;
}

const AnalyticsDashboard: React.FC<Props> = ({ data }) => {
    if (!data) return null;

    const getScoreColor = (score: number) => {
        if (score >= 75) return 'text-emerald-500';
        if (score >= 50) return 'text-sky-500';
        if (score >= 30) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <div className="glass-panel p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mt-8 mb-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                    <BarChart2 className="w-6 h-6 mr-3 text-indigo-500" />
                    EQ & Sales Coach
                </h3>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    AI Analysis
                </span>
            </div>

            {/* Top Row: KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Sentiment Gauge */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500"></div>
                    <div className="mb-3 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Meeting Sentiment
                    </div>
                    <div className={`text-6xl font-black mb-2 tracking-tighter ${getScoreColor(data.score)}`}>
                        {data.score}
                    </div>
                    <div className="text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm">
                        {data.label}
                    </div>
                </div>

                {/* Engagement (Speaker Stats) */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                    <div className="mb-5 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4" /> Speaker Dominance
                    </div>
                    <div className="space-y-4">
                        {data.speakerStats.map((speaker, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-xs mb-1.5 font-medium">
                                    <span className="text-slate-700 dark:text-slate-200">{speaker.name}</span>
                                    <span className="text-slate-500">{speaker.percentage}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out" 
                                        style={{ width: `${speaker.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Emotional Signals */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                    <div className="mb-5 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <Smile className="w-4 h-4" /> Emotional Subtext
                    </div>
                    <div className="space-y-4">
                        {data.emotions.map((emotion, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-24 text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{emotion.name}</div>
                                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${emotion.name === 'Hesitation' ? 'bg-amber-500' : 'bg-sky-500'}`}
                                        style={{ width: `${emotion.value}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs font-mono text-slate-500 w-8 text-right">{emotion.value}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: The "Coach" Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Subtext Scanner */}
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-6 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-sky-500" /> Subtext Scanner
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Buying Signals */}
                        <div>
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> BUYING SIGNALS
                            </div>
                            <ul className="space-y-2">
                                {data.salesSignals?.length > 0 ? data.salesSignals.map((signal, i) => (
                                    <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 mr-2 flex-shrink-0"></span>
                                        {signal}
                                    </li>
                                )) : <li className="text-sm text-slate-400 italic">No clear signals detected.</li>}
                            </ul>
                        </div>
                        {/* Risks */}
                        <div>
                            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-3 flex items-center">
                                <AlertOctagon className="w-3 h-3 mr-1" /> DETECTED RISKS
                            </div>
                            <ul className="space-y-2">
                                {data.objections?.length > 0 ? data.objections.map((obj, i) => (
                                    <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 mr-2 flex-shrink-0"></span>
                                        {obj}
                                    </li>
                                )) : <li className="text-sm text-slate-400 italic">No risks detected.</li>}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Coaching Corner */}
                <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Lightbulb className="w-24 h-24" />
                    </div>
                    <h4 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-4 flex items-center relative z-10">
                        <Lightbulb className="w-4 h-4 mr-2" /> Zayna's Coaching Corner
                    </h4>
                    <div className="space-y-3 relative z-10">
                        {data.coachingTips?.length > 0 ? data.coachingTips.map((tip, i) => (
                            <div key={i} className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 text-sm text-slate-700 dark:text-slate-300 flex gap-3">
                                <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">
                                    {i + 1}
                                </div>
                                {tip}
                            </div>
                        )) : <p className="text-sm text-slate-500 italic">Recording too short for coaching insights.</p>}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnalyticsDashboard;
