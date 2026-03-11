
import { useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronUp, Clock, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const FollowupDetailsFetcher = ({ campaignId, initialConfig }: { campaignId: string, initialConfig: any[] }) => {
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState<any[]>([]);
    const [expandedStep, setExpandedStep] = useState<number | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/whatsapp/campaigns/details?id=${campaignId}`);
                const data = await res.json();
                if (mounted && data.success && data.steps) {
                    setDetails(data.steps);
                } else if (mounted) {
                    // Fallback
                    setDetails(initialConfig.map((step, idx) => ({
                        step_number: idx + 1,
                        delay_hours: step.delay_hours,
                        template: { template_name: step.template_name || "Template " + (idx + 1) },
                        stats: null
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch follow-up details", err);
                if (mounted) {
                    setDetails(initialConfig.map((step, idx) => ({
                        step_number: idx + 1,
                        delay_hours: step.delay_hours,
                        template: { template_name: step.template_name || "Template " + (idx + 1) },
                        stats: null
                    })));
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchDetails();
        return () => { mounted = false; };
    }, [campaignId, initialConfig]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4 bg-white rounded-lg border border-slate-100">
                <Loader2 className="h-5 w-5 text-emerald-500 animate-spin mr-2" />
                <span className="text-sm text-slate-500">Loading follow-up details...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {details.map((step, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-emerald-50 shadow-sm overflow-hidden transition-all duration-200">

                    {/* Header Row */}
                    <div
                        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50"
                        onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                    >
                        <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm border border-emerald-200">
                            {step.step_number}
                        </div>

                        <div className="flex-grow">
                            <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-slate-800 flex items-center gap-2">
                                    {step.template?.template_name || "Unknown Template"}
                                    {expandedStep === idx ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                                </p>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Step {step.step_number}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                Sends <span className="font-semibold text-slate-700">{step.delay_hours} hours</span> after {idx === 0 ? "initial message" : `Step ${idx}`}
                            </p>
                        </div>
                    </div>

                    {/* Expanded Content: Stats & Preview */}
                    {expandedStep === idx && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">

                            {/* Stats Grid */}
                            {step.stats && (
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    <div className="bg-white p-2 rounded border border-slate-100 text-center">
                                        <div className="text-xs text-slate-400 uppercase font-semibold">Sent</div>
                                        <div className="text-lg font-bold text-blue-600">{step.stats.sent}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded border border-slate-100 text-center">
                                        <div className="text-xs text-slate-400 uppercase font-semibold">Delivered</div>
                                        <div className="text-lg font-bold text-emerald-600">{step.stats.delivered}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded border border-slate-100 text-center">
                                        <div className="text-xs text-slate-400 uppercase font-semibold">Read</div>
                                        <div className="text-lg font-bold text-emerald-700">{step.stats.read}</div>
                                    </div>
                                    <div className="bg-white p-2 rounded border border-slate-100 text-center">
                                        <div className="text-xs text-slate-400 uppercase font-semibold">Replied</div>
                                        <div className="text-lg font-bold text-purple-600">{step.stats.replied}</div>
                                    </div>
                                </div>
                            )}

                            {/* Template Content Preview */}
                            {step.template && (step.template.body_text || step.template.header_text) && (
                                <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden max-w-sm mx-auto">
                                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-xs font-medium text-slate-500 flex items-center gap-2">
                                        <MessageSquare className="h-3 w-3" />
                                        Message Content
                                    </div>
                                    {step.template.header_media_url && (
                                        <div className="h-32 bg-slate-100 w-full relative">
                                            {/* Simplified media preview */}
                                            {step.template.header_type === 'IMAGE' ? (
                                                <img src={step.template.header_media_url} className="w-full h-full object-cover" alt="Header" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-medium bg-slate-200">
                                                    [VIDEO HEADER]
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="p-3 text-sm text-slate-800 whitespace-pre-wrap">
                                        {step.template.header_text && <div className="font-bold mb-2">{step.template.header_text}</div>}
                                        {step.template.body_text}
                                        {step.template.footer_text && <div className="text-xs text-slate-400 mt-2">{step.template.footer_text}</div>}
                                    </div>
                                    {step.template.buttons && step.template.buttons.length > 0 && (
                                        <div className="border-t divide-y">
                                            {step.template.buttons.map((btn: any, bIdx: number) => (
                                                <div key={bIdx} className="p-2 text-center text-blue-600 text-xs font-medium cursor-default">
                                                    {btn.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
