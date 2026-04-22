import { useEffect, useState } from "react";
import { CirclePlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import ElderFormDialog from "../../components/customer/ElderFormDialog";
import apiClient from "../../lib/apiClient";

export default function ElderManagement() {
  const [elders, setElders] = useState([]);
  const [selectedElder, setSelectedElder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => apiClient.get("/elders").then((response) => setElders(response.data));

  useEffect(() => {
    load();
  }, []);

  const remove = async (elderId) => {
    await apiClient.delete(`/elders/${elderId}`);
    toast.success("Elder removed.");
    await load();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">Family Profile</p>
            <h2 className="mt-2 text-[1.85rem] font-semibold text-slate-900">Elders linked to this account</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Add new elders or update existing profiles from this space.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              {elders.length} profile{elders.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedElder(null);
                setDialogOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <CirclePlus size={16} />
              Add Elder
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {elders.length ? (
          elders.map((elder) => (
            <article key={elder.id} className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-slate-900">{elder.full_name}</p>
                  <p className="mt-1 text-sm text-slate-600">Age {elder.age}</p>
                  <p className="mt-2 text-sm text-slate-600">{elder.home_address}</p>
                  <p className="mt-1 text-sm text-slate-600">Flat / Unit: {elder.flat_label || "Not added"}</p>
                  <p className="mt-1 text-sm text-slate-600">Pod: {elder.pod_name || "Unassigned"}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Emergency contact: {elder.emergency_contact_name || "Not added"}
                    {elder.emergency_contact_phone ? ` | ${elder.emergency_contact_phone}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedElder(elder);
                      setDialogOpen(true);
                    }}
                    className="rounded-2xl bg-cyan-50 p-3 text-cyan-700 transition hover:bg-cyan-100"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(elder.id)}
                    className="rounded-2xl bg-rose-50 p-3 text-rose-700 transition hover:bg-rose-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No elder profiles yet. Use the Add Elder button here to create the first one.
          </p>
        )}
      </section>

      <ElderFormDialog
        open={dialogOpen}
        title={selectedElder ? "Edit Elder" : "Add Elder"}
        elder={selectedElder}
        onClose={() => {
          setDialogOpen(false);
          setSelectedElder(null);
        }}
        onSuccess={load}
      />
    </div>
  );
}
