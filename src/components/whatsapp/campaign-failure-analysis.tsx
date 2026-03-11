"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, Phone } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FailureData {
    error_message: string;
    count: number;
    sample_phones: string[];
    all_phones: string[];
}

export function CampaignFailureAnalysis({ campaignId }: { campaignId: string }) {
    const [data, setData] = useState<FailureData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalFailed, setTotalFailed] = useState(0);
    const [selectedFailure, setSelectedFailure] = useState<FailureData | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCopy = (phones: string[]) => {
        navigator.clipboard.writeText(phones.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        const fetchFailures = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/whatsapp/campaigns/failures?campaign_id=${campaignId}`);
                const result = await res.json();
                if (result.success) {
                    setData(result.error_breakdown || []);
                    setTotalFailed(result.total_failed || 0);
                } else {
                    setError(result.error || "Failed to load data");
                }
            } catch (err: any) {
                setError(err.message || "Network error");
            } finally {
                setLoading(false);
            }
        };
        if (campaignId) fetchFailures();
    }, [campaignId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-emerald-500" />
                <p>Analyzing failure reasons...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-red-500">
                <AlertCircle className="h-8 w-8 mb-4" />
                <p>Error: {error}</p>
            </div>
        );
    }

    if (totalFailed === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
                 <p className="text-lg font-medium text-slate-700">No Failures Detected</p>
                 <p className="text-sm">This campaign is running perfectly!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="bg-red-50 border-red-100">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium text-red-700 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" /> Total Failures
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-red-800">{totalFailed}</p>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {data.map((item, index) => (
                    <Card key={index} onClick={() => setSelectedFailure(item)} className="cursor-pointer hover:shadow-md transition-shadow">
                        <div className="p-4">
                             <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-slate-900">{item.error_message}</h4>
                                <Badge variant="outline" className="bg-red-50 text-red-700">{item.count} occurrences</Badge>
                            </div>
                            <div className="text-sm text-slate-500">
                                Affected: {item.sample_phones.join(", ")} {item.count > item.sample_phones.length ? `+${item.count - item.sample_phones.length} more` : ""}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <Dialog open={!!selectedFailure} onOpenChange={(open) => !open && setSelectedFailure(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Failure Details</DialogTitle>
                        <DialogDescription>{selectedFailure?.error_message}</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium">Affected Numbers ({selectedFailure?.count})</span>
                        <Button variant="ghost" size="sm" onClick={() => selectedFailure && handleCopy(selectedFailure.all_phones)}>
                            {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            {copied ? "Copied" : "Copy List"}
                        </Button>
                    </div>
                    <ScrollArea className="h-[300px] border rounded-md p-4">
                        <div className="space-y-1">
                            {selectedFailure?.all_phones.map((phone, idx) => (
                                <div key={idx} className="text-sm font-mono text-slate-600">{phone}</div>
                            ))}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
