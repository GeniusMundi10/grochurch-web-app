"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle2, LayoutDashboard, Building2 } from "lucide-react";

// Recharts imports
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Pie,
    PieChart,
    Cell,
    Area,
    AreaChart,
} from "recharts";

interface SuperAdminRow {
    id: string;
    name: string | null;
    email: string | null;
    company: string | null;
    website: string | null;
    phone: string | null;
    plan: string;
    created_at: string;
    total_members: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
const PIE_COLORS = ['#3b82f6', '#e2e8f0'];

export default function SuperAdminPage() {
    const router = useRouter();
    const supabase = createClient();
    const [data, setData] = useState<SuperAdminRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    const handleUpdatePlan = async (churchId: string, company: string | null, currentPlan: string, newPlan: string) => {
        if (currentPlan === newPlan) return;
        if (!confirm(`Change ${company || 'Unknown Church'}'s plan from '${currentPlan}' to '${newPlan}'?`)) return;
        
        try {
            const res = await fetch('/api/admin/update-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ church_id: churchId, plan: newPlan })
            });
            const d = await res.json();
            if (d.success) {
                setData(prev => prev.map(u => u.id === churchId ? { ...u, plan: newPlan } : u));
            } else {
                alert(d.error || "Failed to update plan");
            }
        } catch (err) {
            alert("Error updating plan");
            console.error(err);
        }
    };

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user?.email) {
                router.push("/login");
                return;
            }

            // Hardcoded super-admin check
            const superAdmins = ["proftribute@gmail.com", "mundigenius@gmail.com"];
            if (!superAdmins.includes(user.email.toLowerCase())) {
                router.push("/dashboard");
                return;
            }

            setAuthorized(true);

            try {
                const { data: analytics, error } = await supabase.rpc('get_admin_platform_analytics');
                if (error) throw error;
                setData(analytics || []);
            } catch (err) {
                console.error("Failed to fetch super admin analytics:", err);
            } finally {
                setLoading(false);
            }
        };

        checkAuthAndFetch();
    }, [router, supabase]);

    // --- Chart Data Transformations ---
    const chartData = useMemo(() => {
        if (!data.length) return null;

        // 1. Free vs Paid
        const paidCount = data.filter(d => d.plan && d.plan.toLowerCase() !== 'free').length;
        const freeCount = data.length - paidCount;
        const planDistribution = [
            { name: 'Paid', value: paidCount },
            { name: 'Free', value: freeCount }
        ];

        // 2. Top 5 Churches by Member Size
        const topChurches = [...data]
            .sort((a, b) => (b.total_members || 0) - (a.total_members || 0))
            .slice(0, 5)
            .map(d => ({
                name: (d.company || 'Unknown').substring(0, 15),
                members: d.total_members || 0
            }));

        // 3. Growth Timeline (Strictly Last 12 Months Chronological)
        const timelineDataMap = new Map<string, number>();
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            timelineDataMap.set(key, 0); // Pre-fill with 0
        }

        data.forEach(church => {
            if (!church.created_at) return;
            const date = new Date(church.created_at);
            const key = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (timelineDataMap.has(key)) {
                timelineDataMap.set(key, timelineDataMap.get(key)! + 1);
            }
        });

        const timelineData = Array.from(timelineDataMap.entries())
            .map(([date, signups]) => ({ date, signups }));

        return { planDistribution, topChurches, timelineData };
    }, [data]);

    if (!authorized) {
        return null;
    }

    // Calculate KPIs
    const totalChurches = data.length;
    const totalPaid = data.filter(d => d.plan && d.plan.toLowerCase() !== 'free').length;
    const totalPlatformMembers = data.reduce((acc, curr) => acc + (curr.total_members || 0), 0);

    return (
        <div className="flex flex-col gap-6 p-6 h-full w-full mx-auto pb-24">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Analytics</h1>
                <p className="text-muted-foreground mt-1 text-sm tracking-tight text-slate-500">
                    Super Admin View exclusively for Proftribute.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{loading ? "..." : totalChurches}</div>
                    <div className="text-sm text-gray-500">Total Churches</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{loading ? "..." : totalPaid}</div>
                    <div className="text-sm text-gray-500">Paid Subscriptions</div>
                </div>

                <div className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{loading ? "..." : totalPlatformMembers.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Total Tracked Members</div>
                </div>
            </div>

            {/* Visualizations Grid */}
            {!loading && chartData && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                    {/* Growth Timeline */}
                    <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Platform Growth</h3>
                            <p className="text-sm text-gray-500">Churches registered over the last 12 months</p>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickMargin={10} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    <Area type="monotone" dataKey="signups" stroke="#ef4444" fillOpacity={1} fill="url(#colorSignups)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Congregations Bar Chart */}
                    <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Top Congregations</h3>
                            <p className="text-sm text-gray-500">By total member count</p>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.topChurches} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickMargin={10} />
                                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                                    <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    <Bar dataKey="members" radius={[4, 4, 0, 0]}>
                                        {chartData.topChurches.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Paid vs Free Pie */}
                    <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Plan Distribution</h3>
                            <p className="text-sm text-gray-500">Monetization split</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.planDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            <Cell fill="#ef4444" /> {/* Red for paid */}
                                            <Cell fill="#e2e8f0" /> {/* Gray for free */}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Legend */}
                            <div className="flex gap-4 min-w-[120px] mt-2">
                                <div className="flex items-center text-sm">
                                    <div className="w-3 h-3 rounded-full mr-2 bg-red-500" />
                                    <span className="font-semibold">{totalPaid} Paid</span>
                                </div>
                                <div className="flex items-center text-sm">
                                    <div className="w-3 h-3 rounded-full mr-2 bg-slate-200" />
                                    <span className="font-semibold">{totalChurches - totalPaid} Free</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {/* Data Table */}
            <div className="col-span-4 mt-4 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900">Global Church Directory</h3>
                    <p className="text-sm text-gray-500">Manage platform instances</p>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-gray-100 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-medium">Church</th>
                                <th className="px-6 py-4 font-medium">Primary Admin</th>
                                <th className="px-6 py-4 font-medium">Website</th>
                                <th className="px-6 py-4 font-medium text-right">Plan</th>
                                <th className="px-6 py-4 font-medium text-right">Members</th>
                                <th className="px-6 py-4 font-medium text-right">Joined</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center h-24 text-muted-foreground">
                                        Loading directory...
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No churches found.
                                    </td>
                                </tr>
                            ) : (
                                data.map((church) => (
                                    <tr key={church.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{church.company || "Unnamed Church"}</div>
                                            <div className="text-xs text-muted-foreground mt-1">{church.phone || "-"}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{church.name || "Unknown Admin"}</div>
                                            <div className="text-xs text-muted-foreground mt-1">{church.email}</div>
                                        </td>
                                        <td className="px-6 py-4 max-w-[150px] truncate">
                                            {church.website ? (
                                                <a href={church.website.startsWith('http') ? church.website : `https://${church.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">
                                                    {church.website.replace(/^https?:\/\//, '')}
                                                </a>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Badge variant={church.plan?.toLowerCase() !== "free" ? "default" : "secondary"}>
                                                {church.plan || "free"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                                            {church.total_members || 0}
                                        </td>
                                        <td className="px-6 py-4 text-right text-muted-foreground whitespace-nowrap">
                                            {new Date(church.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <select
                                                value={church.plan || "free"}
                                                onChange={(e) => handleUpdatePlan(church.id, church.company, church.plan || "free", e.target.value)}
                                                className="h-9 text-sm border-gray-200 border rounded-md px-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                                            >
                                                <option value="free">Free</option>
                                                <option value="rescue">Rescue</option>
                                                <option value="thrive">Thrive</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
