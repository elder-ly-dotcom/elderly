import { useEffect, useMemo, useState } from "react";

import apiClient from "../../lib/apiClient";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [verifiedFilter, setVerifiedFilter] = useState("ALL");

  useEffect(() => {
    apiClient.get("/admin/users").then((response) => setUsers(response.data));
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = [user.full_name, user.email, user.phone_number || "", user.base_location || ""]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesVerified =
        verifiedFilter === "ALL" ||
        (verifiedFilter === "VERIFIED" ? user.is_verified : !user.is_verified);
      return matchesSearch && matchesRole && matchesVerified;
    });
  }, [users, search, roleFilter, verifiedFilter]);

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-cyan-100 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">User management</h2>
            <p className="mt-1 text-sm text-slate-600">Search, filter, and review all platform users in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone, location"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none"
            />
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none">
              <option value="ALL">All roles</option>
              <option value="Customer">Customers</option>
              <option value="Worker">Workers</option>
              <option value="Admin">Admins</option>
            </select>
            <select value={verifiedFilter} onChange={(event) => setVerifiedFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none">
              <option value="ALL">All verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="UNVERIFIED">Unverified</option>
            </select>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Base Location</th>
                <th className="px-4 py-3">Verified</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-200 text-slate-700">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.full_name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.phone_number || "Not added"}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.base_location || "Not set"}</td>
                  <td className="px-4 py-3">{user.is_verified ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
