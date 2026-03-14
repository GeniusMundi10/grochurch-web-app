"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Upload, Search, Download, Trash2, Info, X, FileSpreadsheet, CheckCircle2 } from "lucide-react";

export default function ProspectsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setLeads(data);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/leads/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchLeads();
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      alert("Error uploading file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const downloadSampleCSV = () => {
    const content = "Name,Phone,Email\nJohn Doe,1234567890,john@example.com\nJane Smith,0987654321,jane@example.com";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_congregation.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteLead = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prospect?")) return;
    await supabase.from("leads").delete().eq("id", id);
    fetchLeads();
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Prospects & Leads</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your community outreach targets</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                showGuide ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Info className="h-4 w-4" />
              {showGuide ? "Hide Guide" : "Upload Guide"}
            </button>
            <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm border hover:bg-gray-50">
              {uploading ? "Uploading..." : "Bulk Upload CSV"}
              <Upload className="h-4 w-4" />
              <input type="file" className="sr-only" accept=".csv" onChange={handleFileUpload} disabled={uploading} />
            </label>
            <button className="flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700">
              <Plus className="h-4 w-4" /> Add Prospect
            </button>
          </div>
        </div>

        {/* Pastor Guide Section */}
        {showGuide && (
          <div className="bg-white rounded-xl border-2 border-orange-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-orange-50/50 p-4 border-b border-orange-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-800 font-semibold">
                <FileSpreadsheet className="w-5 h-5" />
                CSV Upload Instructions
              </div>
              <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Required CSV Format</h4>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Phone (Required):</strong> Must have a "Phone" column. This identifies each person uniquely.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Name (Optional):</strong> Full name of the congregation member.</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Email (Optional):</strong> Secondary contact information.</span>
                  </li>
                </ul>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>Note:</strong> Numbers will be cleaned automatically. If a phone number already exists, the record will be updated instead of duplicated.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Visual Sample</h4>
                <div className="bg-gray-900 rounded-lg p-3 font-mono text-[11px] text-gray-300 overflow-x-auto shadow-inner">
                  <div className="text-gray-500 border-b border-gray-800 pb-1 mb-1">Name, Phone, Email</div>
                  <div>John Doe, 1234567890, john@church.com</div>
                  <div>Jane Smith, 5550199222, jane@faith.org</div>
                </div>
                <button
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-2 text-sm text-orange-600 font-medium hover:text-orange-700 hover:underline"
                >
                  <Download className="w-4 h-4" />
                  Download Sample Template
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search prospects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="text-sm text-gray-500 font-medium">
              Total: {leads.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading prospects...</td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No prospects found.</td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">{lead.name || "—"}</td>
                      <td className="px-6 py-4 font-mono text-gray-600">{lead.phone || "—"}</td>
                      <td className="px-6 py-4 text-gray-600">{lead.email || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                          {lead.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 capitalize">{lead.source?.replace("_", " ") || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteLead(lead.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

