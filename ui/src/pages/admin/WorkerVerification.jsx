import { useEffect, useState } from "react";
import { FileText, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import ModalDialog from "../../components/app/ModalDialog";
import apiClient from "../../lib/apiClient";
import { toApiUrl } from "../../lib/runtimeConfig";

export default function WorkerVerification() {
  const [workers, setWorkers] = useState([]);
  const [documentPreview, setDocumentPreview] = useState(null);

  const load = () => apiClient.get("/admin/workers/pending").then((response) => setWorkers(response.data));

  useEffect(() => {
    load();
  }, []);

  const uploadDocument = async (userId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const uploadResponse = await apiClient.post("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const documentUrl = toApiUrl(uploadResponse.data.url);
    await apiClient.post(`/auth/workers/${userId}/verification-document`, null, {
      params: { document_url: documentUrl },
    });
    toast.success("Verification document uploaded.");
    load();
  };

  const approve = async (userId) => {
    await apiClient.post(`/auth/workers/${userId}/verify`);
    toast.success("Worker verified and moved to Workers With Us.");
    load();
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[2rem] border border-amber-100 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <p className="text-sm uppercase tracking-[0.3em] text-amber-700">Pending Workers</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-900">Workers waiting for verification</h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-600">
          Review uploaded documents, then approve only the workers who are ready to work with ELDERLY.
        </p>
      </section>

      <div className="grid gap-4">
        {workers.length ? (
          workers.map((worker) => (
            <div key={worker.id} className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-xl font-semibold text-slate-900">{worker.full_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{worker.email}</p>
                  <p className="mt-1 text-sm text-slate-600">{worker.phone_number || "Contact not added yet"}</p>
                  <span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    Pending verification
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <UploadCloud size={16} />
                    Upload document
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) uploadDocument(worker.id, file);
                      }}
                    />
                  </label>

                  {worker.verification_document_url ? (
                    <button
                      type="button"
                      onClick={() => setDocumentPreview(worker.verification_document_url)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <FileText size={16} />
                      Open document
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => approve(worker.id)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.22)] transition hover:bg-emerald-600"
                  >
                    <ShieldCheck size={16} />
                    Approve worker
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 text-sm text-slate-600 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
            No pending workers right now.
          </div>
        )}
      </div>

      <ModalDialog
        open={Boolean(documentPreview)}
        title="Verification Document"
        onClose={() => setDocumentPreview(null)}
        widthClass="max-w-5xl"
      >
        {documentPreview ? (
          documentPreview.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? (
            <img src={documentPreview} alt="Verification document" className="max-h-[70vh] w-full rounded-3xl object-contain" />
          ) : (
            <iframe title="Verification document" src={documentPreview} className="h-[70vh] w-full rounded-3xl border border-slate-200" />
          )
        ) : null}
      </ModalDialog>
    </div>
  );
}
