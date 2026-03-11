"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarDays, Clock, CheckCircle2, XCircle, Eye, MessageSquare } from "lucide-react";
import { format, parseISO, isAfter, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface CampaignDailyStatsProps {
    campaignId: string;
    className?: string;
}

interface DailyStat {
    date: string;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    failed: number;
    cancelled: number;
    total: number;
    isFuture: boolean;
}

export function CampaignDailyStats({ campaignId, className }: CampaignDailyStatsProps) {
    const [stats, setStats] = useState<DailyStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [totals, setTotals] = useState({ pending: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, cancelled: 0, total: 0 });
    const supabase = createClient();

    useEffect(() => {
        let mounted = true;
        const fetchStats = async () => {
            setLoading(true);
            try {
                const { data: messages, error } = await supabase
                    .from("campaign_messages")
                    .select("status, created_at, scheduled_at, sent_at")
                    .eq("campaign_id", campaignId);

                if (error) throw error;
                if (!mounted) return;

                if (!messages || messages.length === 0) {
                    setStats([]);
                    setTotals({ pending: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, cancelled: 0, total: 0 });
                    return;
                }

                const today = startOfDay(new Date());
                const aggregation: Record<string, DailyStat> = {};

                messages.forEach((msg) => {
                    const dateSource = msg.scheduled_at || msg.sent_at || msg.created_at;
                    if (!dateSource) return;

                    const dateKey = format(parseISO(dateSource), "yyyy-MM-dd");
                    const isFuture = isAfter(startOfDay(parseISO(dateSource)), today);

                    if (!aggregation[dateKey]) {
                        aggregation[dateKey] = {
                            date: dateKey,
                            pending: 0,
                            sent: 0,
                            delivered: 0,
                            read: 0,
                            replied: 0,
                            failed: 0,
                            cancelled: 0,
                            total: 0,
                            isFuture
                        };
                    }

                    aggregation[dateKey].total++;
                    const status = (msg.status || "").toUpperCase();

                    switch (status) {
                        case "PENDING": aggregation[dateKey].pending++; break;
                        case "SENT": aggregation[dateKey].sent++; break;
                        case "DELIVERED": aggregation[dateKey].delivered++; break;
                        case "READ": aggregation[dateKey].read++; break;
                        case "REPLIED": aggregation[dateKey].replied++; break;
                        case "FAILED": aggregation[dateKey].failed++; break;
                        case "CANCELLED":
                        case "STOPPED": aggregation[dateKey].cancelled++; break;
                        default: aggregation[dateKey].pending++; break;
                    }
                });

                const result = Object.values(aggregation).sort((a, b) => a.date.localeCompare(b.date));
                const t = { pending: 0, sent: 0, delivered: 0, read: 0, replied: 0, failed: 0, cancelled: 0, total: 0 };
                result.forEach(r => {
                    t.pending += r.pending;
                    t.sent += r.sent;
                    t.delivered += r.delivered;
                    t.read += r.read;
                    t.replied += r.replied;
                    t.failed += r.failed;
                    t.cancelled += r.cancelled;
                    t.total += r.total;
                });

                setStats(result);
                setTotals(t);
            } catch (err) {
                console.error("Error fetching daily stats:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        if (campaignId) fetchStats();
        return () => { mounted = false; };
    }, [campaignId, supabase]);

    if (loading) {
        return (
            <div className={cn("space-y-6", className)}>
                <Card>
                    <CardContent className="h-[300px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    const chartData = stats.map(s => ({
        date: s.date,
        Pending: s.pending,
        Sent: s.sent,
        Delivered: s.delivered,
        Read: s.read,
        Replied: s.replied,
        Failed: s.failed,
    }));

    return (
        <div className={cn("space-y-6", className)}>
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-500">Days</span>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{stats.length}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600">Sent</span>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{totals.sent + totals.delivered + totals.read + totals.replied}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <Clock className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600">Pending</span>
                    </div>
                    <p className="text-xl font-bold text-amber-700">{totals.pending}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs font-medium text-red-600">Failed</span>
                    </div>
                    <p className="text-xl font-bold text-red-700">{totals.failed}</p>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">Visual Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(val) => format(parseISO(val), "MMM d")} tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} width={30} />
                                <Tooltip labelFormatter={(label) => format(parseISO(label), "MMM d, yyyy")} />
                                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Sent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Read" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
