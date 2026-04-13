import { useEffect, useState } from "react";
import { toast } from "sonner";

import ModalDialog from "../app/ModalDialog";
import apiClient from "../../lib/apiClient";

const baseForm = {
  full_name: "",
  age: 60,
  flat_label: "",
  home_address: "",
  home_latitude: 22.7081,
  home_longitude: 88.3918,
  pod_name: "Sodepur High-rise A",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

export default function ElderFormDialog({ open, title, elder = null, onClose, onSuccess }) {
  const [form, setForm] = useState(baseForm);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addressResolved, setAddressResolved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (elder) {
      setForm({
        full_name: elder.full_name,
        age: elder.age,
        flat_label: elder.flat_label || "",
        home_address: elder.home_address,
        home_latitude: elder.home_latitude,
        home_longitude: elder.home_longitude,
        pod_name: elder.pod_name || "",
        emergency_contact_name: elder.emergency_contact_name || "",
        emergency_contact_phone: elder.emergency_contact_phone || "",
      });
      setAddressQuery(elder.home_address);
      setAddressResolved(true);
    } else {
      setForm(baseForm);
      setAddressQuery("");
      setAddressResolved(false);
    }
    setAddressSuggestions([]);
  }, [open, elder]);

  useEffect(() => {
    if (!open || addressResolved || addressQuery.trim().length < 3) {
      if (addressQuery.trim().length < 3) {
        setAddressSuggestions([]);
      }
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiClient.get("/locations/autocomplete", { params: { q: addressQuery } });
        setAddressSuggestions(response.data);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [open, addressQuery, addressResolved]);

  const selectSuggestion = async (suggestion) => {
    const response = await apiClient.get("/locations/resolve", {
      params: { place_id: suggestion.place_id },
    });
    setForm((current) => ({
      ...current,
      home_address: response.data.formatted_address,
      home_latitude: response.data.latitude,
      home_longitude: response.data.longitude,
    }));
    setAddressQuery(response.data.formatted_address);
    setAddressSuggestions([]);
    setAddressResolved(true);
    toast.success("Address locked with map coordinates.");
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!addressResolved) {
      toast.error("Please choose one address suggestion before saving.");
      return;
    }
    setSaving(true);
    try {
      if (elder) {
        await apiClient.put(`/elders/${elder.id}`, form);
        toast.success("Elder profile updated.");
      } else {
        await apiClient.post("/elders", form);
        toast.success("Elder profile created.");
      }
      onSuccess?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalDialog open={open} title={title} onClose={onClose} widthClass="max-w-3xl">
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Full name" value={form.full_name} onChange={(value) => setForm((current) => ({ ...current, full_name: value }))} />
          <Field label="Age" type="number" value={form.age} onChange={(value) => setForm((current) => ({ ...current, age: Number(value) }))} />
          <Field
            label="Flat / Unit / Apartment"
            value={form.flat_label}
            onChange={(value) => setForm((current) => ({ ...current, flat_label: value }))}
          />
          <Field label="Pod name" value={form.pod_name} onChange={(value) => setForm((current) => ({ ...current, pod_name: value }))} />
          <Field
            label="Emergency contact name"
            value={form.emergency_contact_name}
            onChange={(value) => setForm((current) => ({ ...current, emergency_contact_name: value }))}
          />
          <Field
            label="Emergency contact phone"
            value={form.emergency_contact_phone}
            onChange={(value) => setForm((current) => ({ ...current, emergency_contact_phone: value }))}
          />
        </div>

        <label className="grid gap-2">
          <span className="text-sm text-slate-500">Address</span>
          <input
            value={addressQuery}
            onChange={(event) => {
              const value = event.target.value;
              setAddressQuery(value);
              setAddressResolved(false);
              setForm((current) => ({ ...current, home_address: value }));
            }}
            placeholder="Search by address, apartment, or landmark"
            className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white"
          />
          {searching ? <span className="text-xs text-slate-500">Looking up addresses...</span> : null}
          {addressSuggestions.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_35px_rgba(15,23,42,0.08)]">
              {addressSuggestions.map((suggestion) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className="block w-full rounded-xl px-3 py-2.5 text-left transition hover:bg-cyan-50"
                >
                  <p className="text-sm font-medium text-slate-900">{suggestion.primary_text}</p>
                  <p className="text-xs text-slate-500">{suggestion.secondary_text || suggestion.full_text}</p>
                </button>
              ))}
            </div>
          ) : null}
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <ReadonlyField label="Latitude" value={form.home_latitude} />
          <ReadonlyField label="Longitude" value={form.home_longitude} />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!addressResolved || saving}
            className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : elder ? "Save Changes" : "Create Elder"}
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white"
      />
    </label>
  );
}

function ReadonlyField({ label, value }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm text-slate-500">{label}</span>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700">{value}</div>
    </div>
  );
}
