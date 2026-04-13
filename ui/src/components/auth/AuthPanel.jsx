import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Stethoscope, Users } from "lucide-react";
import { toast } from "sonner";

import apiClient from "../../lib/apiClient";
import { useAuthStore } from "../../store/authStore";

const roleCards = [
  { role: "CUSTOMER", label: "Customer", icon: Users, blurb: "Manage elders, subscriptions, and safety updates." },
  { role: "WORKER", label: "Worker", icon: Stethoscope, blurb: "Start visits, report tasks, and trigger SOS." },
  { role: "ADMIN", label: "Admin", icon: ShieldCheck, blurb: "Verify workers, track live visits, and respond to emergencies." },
];

const registerRoles = ["Customer", "Worker"];

export default function AuthPanel() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone_number: "",
    role: "Customer",
  });
  const [submitting, setSubmitting] = useState(false);

  const portalHint = useMemo(
    () => roleCards.find((item) => item.label === form.role || item.role === form.role),
    [form.role]
  );

  useEffect(() => {
    if (mode === "login") {
      setForm((current) => ({ ...current, role: "Customer" }));
    }
  }, [mode]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const routeForRole = (role) => {
    if (role === "CUSTOMER") return "/customer/dashboard";
    if (role === "WORKER") return "/worker/dashboard";
    return "/admin/dashboard";
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "register") {
        await apiClient.post("/auth/register", {
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          phone_number: form.phone_number,
          role: form.role,
        });
        toast.success("Registration complete. Please log in.");
        setMode("login");
      }

      const loginResponse = await apiClient.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      const token = loginResponse.data.access_token;
      const meResponse = await apiClient.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSession({ token, user: meResponse.data });
      navigate(routeForRole(token ? JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role : null));
      toast.success("Welcome back.");
    } catch (error) {
      if (!error?.response) {
        toast.error("Unable to reach the server.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="auth-panel" className="relative mx-auto mt-8 max-w-6xl px-6 pb-20">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-emerald-100 bg-white/90 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-700">Unified Access</p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Sign in once, then step straight into the right ELDERLY portal.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Customers manage elders and subscriptions, workers run visit workflows, and admins oversee the whole Sodepur network in real time.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {roleCards.map(({ role, label, icon: Icon, blurb }) => (
              <div key={role} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{blurb}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(2,6,23,0.45)]">
          <div className="inline-flex rounded-full bg-white/10 p-1">
            {["login", "register"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  mode === value ? "bg-white text-slate-950" : "text-white/70"
                }`}
              >
                {value === "login" ? "Login" : "Register"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" ? (
              <>
                <Field label="Full name" name="full_name" value={form.full_name} onChange={handleChange} />
                <Field label="Phone number" name="phone_number" value={form.phone_number} onChange={handleChange} />
                <label className="grid gap-2">
                  <span className="text-sm text-white/80">Register as</span>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
                  >
                    {registerRoles.map((item) => (
                      <option key={item} value={item} className="text-slate-900">
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}

            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
            <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} />

            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              <p className="font-medium">Portal destination</p>
              <p className="mt-1 text-cyan-50/80">{portalHint?.blurb ?? "Log in and we will route you to the correct dashboard."}</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-orange-300 px-4 py-3 font-semibold text-slate-950 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Please wait..." : mode === "login" ? "Enter Portal" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({ label, name, type = "text", value, onChange }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-white/80">{label}</span>
      <input
        required
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30"
      />
    </label>
  );
}
