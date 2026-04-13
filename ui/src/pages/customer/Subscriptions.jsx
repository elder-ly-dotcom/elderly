import { useEffect, useMemo, useState } from "react";
import { ArrowUpCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

import ModalDialog from "../../components/app/ModalDialog";
import apiClient from "../../lib/apiClient";

function normalizeAddress(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function CompactInfoCard({ label, value, subvalue, actionLabel, onAction }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {subvalue ? <p className="mt-1 text-sm text-slate-600">{subvalue}</p> : null}
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function SubscriptionsPage() {
  const [catalog, setCatalog] = useState([]);
  const [elders, setElders] = useState([]);
  const [selectedElders, setSelectedElders] = useState([]);
  const [selectedTier, setSelectedTier] = useState("");
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [quote, setQuote] = useState(null);
  const [overview, setOverview] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [mode, setMode] = useState("new");
  const [dialog, setDialog] = useState("");

  const load = () =>
    Promise.all([apiClient.get("/payments/catalog"), apiClient.get("/elders"), apiClient.get("/payments/overview")]).then(
      ([catalogRes, eldersRes, overviewRes]) => {
        setCatalog(catalogRes.data);
        setElders(eldersRes.data);
        setOverview(overviewRes.data);
        setSelectedTier((current) => current || catalogRes.data[0]?.code || "");
      }
    );

  useEffect(() => {
    load();
  }, []);

  const selectedCatalog = useMemo(
    () => catalog.find((item) => item.code === selectedTier),
    [catalog, selectedTier]
  );

  const selectedElderModels = useMemo(
    () => selectedElders.map((elderId) => elders.find((item) => item.id === elderId)).filter(Boolean),
    [selectedElders, elders]
  );

  const groupedSelection = useMemo(
    () =>
      selectedElderModels.reduce((acc, elder) => {
        const key = normalizeAddress(elder.home_address);
        acc[key] = acc[key] || [];
        acc[key].push(elder);
        return acc;
      }, {}),
    [selectedElderModels]
  );

  const additionalElderCount = Object.values(groupedSelection).reduce(
    (sum, group) => sum + Math.max(group.length - 2, 0),
    0
  );
  const selectedLocationCount = Object.keys(groupedSelection).length;

  const toggleElder = (elderId) =>
    setSelectedElders((current) =>
      current.includes(elderId) ? current.filter((item) => item !== elderId) : [...current, elderId]
    );

  const toggleAddOn = (code) =>
    setSelectedAddOns((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code]
    );

  const openReview = async () => {
    if (!selectedElders.length) {
      toast.error("Select at least one elder for the base plan.");
      return;
    }
    const response = await apiClient.post("/payments/quote", {
      elder_ids: selectedElders,
      service_tier_code: selectedTier,
      add_on_codes: selectedAddOns,
      additional_elder_count: additionalElderCount,
    });
    setQuote(response.data);
    setReviewOpen(true);
  };

  const subscribe = async () => {
    if (!quote) return;
    await apiClient.post("/payments/subscribe", {
      elder_ids: selectedElders,
      service_tier_code: selectedTier,
      add_on_codes: selectedAddOns,
      additional_elder_count: additionalElderCount,
      review_accepted: true,
    });
    toast.success(mode === "upgrade" ? "Subscription upgraded." : "Subscription activated.");
    setReviewOpen(false);
    setQuote(null);
    await load();
  };

  const startUpgrade = () => {
    const elderIds = overview?.current_plan?.elders?.map((item) => item.elder_id).filter(Boolean) || [];
    setSelectedElders(elderIds);
    setSelectedAddOns([]);
    setMode("upgrade");
    toast.success("Current plan elders loaded. Choose a new tier or add-ons to upgrade.");
  };

  return (
    <div className="space-y-4 overflow-hidden">
      <section className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-700">Subscriptions</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Compact plan manager</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Keep only the controls you need here. Open details, history, and review in popups.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {overview?.current_plan ? (
              <button
                type="button"
                onClick={startUpgrade}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-600"
              >
                <ArrowUpCircle size={16} />
                Upgrade
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setDialog("history")}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Plan History
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-semibold text-slate-900">Current Setup</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CompactInfoCard
              label="Current Plan"
              value={overview?.current_plan?.service_tier_name || "No active plan"}
              subvalue={
                overview?.current_plan
                  ? `Rs. ${overview.current_plan.total_price} | ${overview.current_plan.billing_cycle}`
                  : "Choose a plan to get started"
              }
              actionLabel={overview?.current_plan ? "View Details" : undefined}
              onAction={() => setDialog("current")}
            />
            <CompactInfoCard
              label="Coverage"
              value={`${selectedLocationCount || overview?.current_plan?.elder_count || 0} selected`}
              subvalue={`${additionalElderCount} add-on elder(s) in builder`}
              actionLabel="Select Elders"
              onAction={() => setDialog("elders")}
            />
            <CompactInfoCard
              label="Tier"
              value={selectedCatalog?.name || "Choose tier"}
              subvalue={selectedCatalog ? `Base Rs. ${selectedCatalog.base_price}` : "No tier selected"}
              actionLabel="Choose Tier"
              onAction={() => setDialog("tiers")}
            />
            <CompactInfoCard
              label="Add-ons"
              value={`${selectedAddOns.length} selected`}
              subvalue={selectedCatalog?.add_ons?.length ? "Open to manage extras" : "No add-ons for this tier"}
              actionLabel="Manage Add-ons"
              onAction={() => setDialog("addons")}
            />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <h3 className="text-xl font-semibold text-slate-900">Builder Summary</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CompactInfoCard label="Selected Elders" value={selectedElders.length} subvalue="Profiles included in builder" />
            <CompactInfoCard label="Selected Locations" value={selectedLocationCount} subvalue="Base plan billed per location" />
            <CompactInfoCard label="Add-on Elders" value={additionalElderCount} subvalue="Charged only above 2 per location" />
            <CompactInfoCard label="Mode" value={mode === "upgrade" ? "Upgrade" : "New Plan"} subvalue="Switches automatically when you load current plan" />
          </div>

          <button
            onClick={openReview}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(6,182,212,0.22)] transition hover:bg-cyan-600"
          >
            <Sparkles size={16} />
            Review In Popup
          </button>
        </div>
      </section>

      <ModalDialog open={dialog === "current"} title="Current Plan Details" onClose={() => setDialog("")} widthClass="max-w-2xl">
        {overview?.current_plan ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-lg font-semibold text-slate-900">{overview.current_plan.service_tier_name}</p>
              <p className="mt-2 text-sm text-slate-600">
                Covers {overview.current_plan.elders.map((item) => item.elder_name).filter(Boolean).join(", ")}
              </p>
              <p className="mt-2 text-sm text-slate-600">Rs. {overview.current_plan.total_price}</p>
            </div>
          </div>
        ) : (
          <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No active subscription yet.</p>
        )}
      </ModalDialog>

      <ModalDialog open={dialog === "tiers"} title="Choose Tier" onClose={() => setDialog("")}>
        <div className="grid gap-3">
          {catalog.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setSelectedTier(item.code);
                setDialog("");
              }}
              className={`rounded-3xl border p-4 text-left transition ${
                selectedTier === item.code
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-slate-50 hover:border-cyan-200 hover:bg-cyan-50/50"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{item.code}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
              <p className="mt-3 text-sm text-emerald-700">Base Rs. {item.base_price} | Additional elder Rs. {item.additional_elder_fee}</p>
            </button>
          ))}
        </div>
      </ModalDialog>

      <ModalDialog open={dialog === "elders"} title="Select Elders" onClose={() => setDialog("")}>
        <div className="space-y-3">
          {elders.map((elder) => (
            <label
              key={elder.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
            >
              <span>
                <span className="font-medium text-slate-900">{elder.full_name}</span>
                <span className="block text-sm text-slate-500">{elder.home_address}</span>
              </span>
              <input type="checkbox" checked={selectedElders.includes(elder.id)} onChange={() => toggleElder(elder.id)} />
            </label>
          ))}
        </div>
      </ModalDialog>

      <ModalDialog open={dialog === "addons"} title="Manage Add-ons" onClose={() => setDialog("")}>
        <div className="space-y-3">
          {(selectedCatalog?.add_ons || []).length ? (
            selectedCatalog.add_ons.map((addon) => (
              <label
                key={addon.code}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
              >
                <span>
                  <span className="font-medium text-slate-900">{addon.name}</span>
                  <span className="block text-sm text-slate-500">Rs. {addon.price}</span>
                </span>
                <input type="checkbox" checked={selectedAddOns.includes(addon.code)} onChange={() => toggleAddOn(addon.code)} />
              </label>
            ))
          ) : (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No add-ons available for the selected tier.
            </p>
          )}
        </div>
      </ModalDialog>

      <ModalDialog open={dialog === "history"} title="Plan History" onClose={() => setDialog("")}>
        <div className="grid gap-3">
          {overview?.plan_history?.length ? (
            overview.plan_history.map((plan) => (
              <div key={plan.plan_group_id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{plan.service_tier_name}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${plan.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {plan.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {plan.elders.map((item) => item.elder_name).filter(Boolean).join(", ")}
                </p>
                <p className="mt-1 text-sm text-slate-500">Rs. {plan.total_price}</p>
              </div>
            ))
          ) : (
            <p className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No subscription history yet.
            </p>
          )}
        </div>
      </ModalDialog>

      <ModalDialog
        open={reviewOpen}
        title={mode === "upgrade" ? "Review Upgrade" : "Review Subscription"}
        onClose={() => setReviewOpen(false)}
        widthClass="max-w-2xl"
      >
        {quote ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-lg font-semibold text-slate-900">{quote.service_tier_name}</p>
              <p className="mt-1">Base plan: Rs. {quote.base_price}</p>
              <p className="mt-1">
                Additional elder fee: Rs. {quote.additional_elder_fee} x {quote.additional_elder_count}
              </p>
              <p className="mt-1">Elders selected: {quote.elder_count}</p>
            </div>

            {quote.add_ons.length ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">Add-ons</p>
                <div className="mt-2 space-y-1">
                  {quote.add_ons.map((addon) => (
                    <p key={addon.code}>- {addon.name} | Rs. {addon.price}</p>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-base font-semibold text-slate-900">Total: Rs. {quote.total_price}</p>
              <p className="mt-1 text-sm text-slate-600">
                {mode === "upgrade"
                  ? "Submitting this will replace active subscriptions for the selected elders."
                  : "Submitting this will activate the plan for the selected elders."}
              </p>
            </div>

            <button
              type="button"
              onClick={subscribe}
              className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600"
            >
              {mode === "upgrade" ? "Confirm Upgrade" : "Confirm Subscription"}
            </button>
          </div>
        ) : null}
      </ModalDialog>
    </div>
  );
}
