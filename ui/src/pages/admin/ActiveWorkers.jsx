import { useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, Phone, Save, SquarePen } from "lucide-react";
import { toast } from "sonner";

import ModalDialog from "../../components/app/ModalDialog";
import apiClient from "../../lib/apiClient";

const emptyForm = {
  full_name: "",
  email: "",
  phone_number: "",
  base_location: "",
  is_active: true,
  available_for_dispatch: true,
};

export default function ActiveWorkers() {
  const [workers, setWorkers] = useState([]);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = () => apiClient.get("/admin/workers/active").then((response) => setWorkers(response.data));

  useEffect(() => {
    load();
  }, []);

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchesSearch = [worker.full_name, worker.email, worker.phone_number || "", worker.base_location || ""]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const status =
        !worker.is_active || !worker.available_for_dispatch
          ? "INACTIVE"
          : worker.is_active_today
            ? "ACTIVE_TODAY"
            : "AVAILABLE";
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workers, search, statusFilter]);

  const openEdit = (worker) => {
    setEditingWorker(worker);
    setForm({
      full_name: worker.full_name,
      email: worker.email,
      phone_number: worker.phone_number || "",
      base_location: worker.base_location || "",
      is_active: worker.is_active,
      available_for_dispatch: worker.available_for_dispatch,
    });
  };

  const saveWorker = async () => {
    await apiClient.patch(`/admin/workers/${editingWorker.id}`, form);
    toast.success("Worker details updated.");
    setEditingWorker(null);
    load();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">Workers With Us</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Verified workers currently on the network</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search worker"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none">
              <option value="ALL">All statuses</option>
              <option value="ACTIVE_TODAY">Active today</option>
              <option value="AVAILABLE">Available</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-4">Worker</th>
                <th className="px-4 py-4">Location</th>
                <th className="px-4 py-4">Contact</th>
                <th className="px-4 py-4">Email</th>
                <th className="px-4 py-4">Dispatch</th>
                <th className="px-4 py-4">Active Today</th>
                <th className="px-4 py-4">Documents</th>
                <th className="px-4 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((worker) => (
                <tr key={worker.id} className="border-t border-slate-200 text-slate-700">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{worker.full_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{worker.is_active ? "Account active" : "Account paused"}</p>
                  </td>
                  <td className="px-4 py-4">{worker.base_location || "Not set"}</td>
                  <td className="px-4 py-4">
                    {worker.phone_number ? (
                      <a href={`tel:${worker.phone_number}`} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 font-medium text-emerald-700 transition hover:bg-emerald-100">
                        <Phone size={15} />
                        {worker.phone_number}
                      </a>
                    ) : (
                      "Not added"
                    )}
                  </td>
                  <td className="px-4 py-4">{worker.email}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${worker.available_for_dispatch ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                      {worker.available_for_dispatch ? "Available" : "Paused"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${worker.is_active_today ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {worker.is_active_today ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {worker.verification_document_url ? (
                      <button
                        type="button"
                        onClick={() => setDocumentPreview(worker.verification_document_url)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <FileText size={15} />
                        Open
                      </button>
                    ) : (
                      "No document"
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {worker.phone_number ? (
                        <a href={`tel:${worker.phone_number}`} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-50 px-3 py-2 font-medium text-cyan-700 hover:bg-cyan-100">
                          <ExternalLink size={15} />
                          Call
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEdit(worker)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 font-medium text-orange-700 transition hover:bg-orange-100"
                      >
                        <SquarePen size={15} />
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ModalDialog open={Boolean(documentPreview)} title="Attached Worker Document" onClose={() => setDocumentPreview(null)} widthClass="max-w-5xl">
        {documentPreview ? (
          documentPreview.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
            <img src={documentPreview} alt="Worker document" className="max-h-[70vh] w-full rounded-3xl object-contain" />
          ) : (
            <iframe title="Worker document" src={documentPreview} className="h-[70vh] w-full rounded-3xl border border-slate-200" />
          )
        ) : null}
      </ModalDialog>

      <ModalDialog open={Boolean(editingWorker)} title="Edit Worker" onClose={() => setEditingWorker(null)} widthClass="max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={form.full_name} onChange={(value) => setForm((current) => ({ ...current, full_name: value }))} />
          <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
          <Field label="Phone number" value={form.phone_number} onChange={(value) => setForm((current) => ({ ...current, phone_number: value }))} />
          <Field label="Base location" value={form.base_location} onChange={(value) => setForm((current) => ({ ...current, base_location: value }))} />
          <Toggle label="Worker account active" checked={form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
          <Toggle label="Available for dispatch" checked={form.available_for_dispatch} onChange={(value) => setForm((current) => ({ ...current, available_for_dispatch: value }))} />
        </div>
        <button
          type="button"
          onClick={saveWorker}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600"
        >
          <Save size={16} />
          Save changes
        </button>
      </ModalDialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white" />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
