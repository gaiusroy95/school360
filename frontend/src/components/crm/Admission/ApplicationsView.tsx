import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Scan,
  UploadCloud,
  AlertCircle,
  Check,
  X,
  CheckCircle,
  FileText,
  Save,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchApplications,
  fetchApplication,
  fetchApplicationMeta,
  updateApplication,
  uploadApplicationDocument,
  updateDocumentExtractedFields,
  deleteApplicationDocument,
  approveApplication,
  rejectApplication,
  fetchDocumentBlobUrl,
  fileToBase64,
  validatePdfFile,
  type Application,
  type ApplicationDocument,
} from '../../../lib/applicationServices';

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusClass(status: string): string {
  if (status === 'Approved' || status === 'Verified') return 'bg-emerald-100 text-emerald-700';
  if (status === 'Rejected') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

function canApprove(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'ADMIN';
}

export function ApplicationsView() {
  const { user } = useAuth();
  const performer = user?.displayName || user?.email || 'Counselor';
  const isApprover = canApprove(user?.role);

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Application | null>(null);
  const [documentTypes, setDocumentTypes] = useState<string[]>([
    'Birth Certificate',
    'Previous Marksheet',
    'Address Proof',
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewInvalidPdf, setPreviewInvalidPdf] = useState(false);
  const [docFields, setDocFields] = useState<Record<string, string>>({});
  const [scoreInput, setScoreInput] = useState('');
  const [uploadType, setUploadType] = useState('Birth Certificate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  type FormDraft = {
    studentName: string;
    dateOfBirth: string;
    fatherName: string;
    motherName: string;
    placeOfBirth: string;
    classApplied: string;
    mobile: string;
    email: string;
    address: string;
  };

  const emptyFormDraft = (): FormDraft => ({
    studentName: '',
    dateOfBirth: '',
    fatherName: '',
    motherName: '',
    placeOfBirth: '',
    classApplied: '',
    mobile: '',
    email: '',
    address: '',
  });

  const [formDraft, setFormDraft] = useState<FormDraft>(emptyFormDraft);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const refreshList = useCallback(async () => {
    try {
      const res = await fetchApplications({ q: searchQuery || undefined });
      setApplications(res.applications);
      setSelectedId((prev) => {
        if (prev && res.applications.some((a) => a.id === prev)) return prev;
        return res.applications[0]?.id ?? null;
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const loadSelected = useCallback(async (id: string) => {
    try {
      const res = await fetchApplication(id);
      setSelected(res.application);
      setScoreInput(
        res.application.entranceTestScore != null ? String(res.application.entranceTestScore) : '',
      );
      const firstDoc = res.application.documents[0];
      setSelectedDocId(firstDoc?.id || null);
      if (firstDoc) {
        setDocFields({ ...firstDoc.extractedFields });
        setUploadType(firstDoc.type);
      } else {
        setDocFields({});
      }
      setFormDraft({
        studentName: res.application.studentName || '',
        dateOfBirth: res.application.dateOfBirth?.slice(0, 10) || '',
        fatherName: res.application.fatherName || '',
        motherName: res.application.motherName || '',
        placeOfBirth: res.application.placeOfBirth || '',
        classApplied: res.application.classApplied || '',
        mobile: res.application.mobile || '',
        email: res.application.email || '',
        address: res.application.address || '',
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load application');
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (selectedId) void loadSelected(selectedId);
    else setSelected(null);
  }, [selectedId, loadSelected]);

  useEffect(() => {
    let revoked: string | null = null;
    const loadPreview = async () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (!selected?.id || !selectedDocId) return;
      const doc = selected.documents.find((d) => d.id === selectedDocId);
      if (!doc) return;
      try {
        const { url, invalidPdf } = await fetchDocumentBlobUrl(selected.id, doc.id);
        revoked = url;
        setPreviewUrl(url);
        setPreviewInvalidPdf(!!invalidPdf);
      } catch {
        setPreviewUrl(null);
        setPreviewInvalidPdf(false);
      }
    };
    void loadPreview();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [selected?.id, selectedDocId, selected?.documents]);

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return applications;
    const q = searchQuery.toLowerCase();
    return applications.filter(
      (a) =>
        a.studentName.toLowerCase().includes(q) ||
        a.applicationId.toLowerCase().includes(q) ||
        a.classApplied.toLowerCase().includes(q),
    );
  }, [applications, searchQuery]);

  const activeDoc: ApplicationDocument | undefined = selected?.documents.find(
    (d) => d.id === selectedDocId,
  );

  const handleSelectApp = (id: string) => {
    setSelectedId(id);
    setRejectOpen(false);
    setRejectRemarks('');
  };

  const handleSaveApplicationForm = async () => {
    if (!selected?.id) return;
    setSubmitting(true);
    try {
      const res = await updateApplication(selected.id, {
        studentName: formDraft.studentName.trim(),
        dateOfBirth: formDraft.dateOfBirth || undefined,
        fatherName: formDraft.fatherName,
        motherName: formDraft.motherName,
        placeOfBirth: formDraft.placeOfBirth,
        classApplied: formDraft.classApplied,
        mobile: formDraft.mobile,
        email: formDraft.email,
        address: formDraft.address,
      });
      setSelected(res.application);
      setApplications((prev) => prev.map((a) => (a.id === res.application.id ? res.application : a)));
      showSuccess('Application form saved');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save application form');
    } finally {
      setSubmitting(false);
    }
  };

  const formIncomplete =
    selected &&
    (!formDraft.dateOfBirth || !formDraft.fatherName || !formDraft.placeOfBirth);

  const handleSaveScore = async () => {
    if (!selected?.id) return;
    const score = scoreInput.trim() === '' ? null : Number(scoreInput);
    if (score != null && (Number.isNaN(score) || score < 0)) {
      showError('Enter a valid entrance test score');
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateApplication(selected.id, { entranceTestScore: score });
      setSelected(res.application);
      setApplications((prev) => prev.map((a) => (a.id === res.application.id ? res.application : a)));
      showSuccess('Entrance test score saved');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to save score');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadClick = () => {
    if (!selectedId) {
      showError('Select an application from the list first, or create one from Enquiries.');
      return;
    }
    if (submitting) return;
    fileInputRef.current?.click();
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const appId = selectedId || selected?.id;
    if (!file || !appId) {
      showError('Select an application before uploading a document.');
      return;
    }
    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf && !(await validatePdfFile(file))) {
      showError('Invalid PDF file. Please upload a real PDF document (not a renamed text file).');
      return;
    }
    setSubmitting(true);
    try {
      const fileData = await fileToBase64(file);
      const app = selected?.id === appId
        ? selected
        : (await fetchApplication(appId)).application;
      const extractedFields: Record<string, string> = {
        studentName: app.studentName,
        dateOfBirth: app.dateOfBirth,
        fatherName: app.fatherName,
        placeOfBirth: app.placeOfBirth,
      };
      await uploadApplicationDocument(appId, {
        type: uploadType,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileData,
        extractedFields,
      });
      await loadSelected(appId);
      await refreshList();
      showSuccess('Document uploaded');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selected?.id || !selectedDocId) return;
    setSubmitting(true);
    try {
      const res = await deleteApplicationDocument(selected.id, selectedDocId);
      if (res.application) {
        setSelected(res.application);
        setApplications((prev) =>
          prev.map((a) => (a.id === res.application!.id ? res.application! : a)),
        );
        const nextDoc = res.application.documents[0];
        setSelectedDocId(nextDoc?.id || null);
        setDocFields(nextDoc ? { ...nextDoc.extractedFields } : {});
      }
      showSuccess('Document removed');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDocFields = async () => {
    if (!selected?.id || !selectedDocId) return;
    setSubmitting(true);
    try {
      const res = await updateDocumentExtractedFields(selected.id, selectedDocId, docFields);
      if (res.application) {
        setSelected(res.application);
        setApplications((prev) =>
          prev.map((a) => (a.id === res.application!.id ? res.application! : a)),
        );
      }
      showSuccess('Document values updated');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update document fields');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selected?.id) return;
    if (selected.entranceTestScore == null) {
      showError('Entrance test merit score is required before approval');
      return;
    }
    if (!isApprover) {
      showError('Only administrators (Principal) can approve applications');
      return;
    }
    setSubmitting(true);
    try {
      const res = await approveApplication(selected.id);
      setSelected(res.application);
      setApplications((prev) => prev.map((a) => (a.id === res.application.id ? res.application : a)));
      showSuccess('Application approved for admission');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selected?.id) return;
    if (!rejectRemarks.trim()) {
      showError('Rejection remarks are required');
      return;
    }
    if (!isApprover) {
      showError('Only administrators (Principal) can reject applications');
      return;
    }
    setSubmitting(true);
    try {
      const res = await rejectApplication(selected.id, rejectRemarks.trim());
      setSelected(res.application);
      setApplications((prev) => prev.map((a) => (a.id === res.application.id ? res.application : a)));
      setRejectOpen(false);
      setRejectRemarks('');
      showSuccess('Application rejected');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    void fetchApplicationMeta()
      .then((m) => setDocumentTypes(m.documentTypes))
      .catch(() => undefined);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 text-sm text-slate-500">
        Loading applications...
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col p-6 overflow-hidden">
      {successMsg && (
        <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm shrink-0">
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm shrink-0">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Applications & Verification</h1>
          <p className="text-sm text-slate-500 mt-1">
            Counselor submissions for principal review and admission approval
          </p>
        </div>
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={submitting}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UploadCloud size={16} />
          Upload Document
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
          className="hidden"
          onChange={handleUploadDocument}
        />
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden min-h-0">
        {/* Applications List */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Recent Applications</h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded font-bold">
              {applications.length} Total
            </span>
          </div>
          <div className="p-3 border-b border-slate-200">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applications..."
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredApps.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No applications yet. Create one from Enquiries → Create Application.
              </p>
            ) : (
              filteredApps.map((app) => (
                <div
                  key={app.id}
                  onClick={() => handleSelectApp(app.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedId === app.id
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-slate-100 hover:border-indigo-100'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-bold text-slate-800">{app.studentName}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusClass(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>
                      {app.classApplied || '—'} • {formatDate(app.submittedAt)}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <Scan size={12} className="text-indigo-500" />
                      Match: {app.verificationScore}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{app.applicationId}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Verification Panel */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
              Select an application to review
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <FileText size={18} className="text-indigo-600" />
                    Application Review — {selected.applicationId}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Submitted by {selected.submittedBy || performer}
                    {selected.enquiryCode ? ` • Enquiry ${selected.enquiryCode}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-slate-500">Merit Score:</span>
                    <input
                      type="number"
                      min={0}
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      className="w-16 px-2 py-1 border border-slate-300 rounded text-xs"
                      placeholder="—"
                      disabled={selected.status === 'Approved' || selected.status === 'Rejected'}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSaveScore()}
                      disabled={submitting || selected.status === 'Approved' || selected.status === 'Rejected'}
                      className="p-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50"
                      title="Save entrance test score"
                    >
                      <Save size={14} />
                    </button>
                  </div>
                  {isApprover && selected.status !== 'Approved' && selected.status !== 'Rejected' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRejectOpen(true)}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-50 flex items-center gap-1"
                      >
                        <X size={14} className="text-red-500" /> Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApprove()}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Check size={14} /> Approve Admission
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Document Previewer */}
                <div className="w-1/2 border-r border-slate-200 bg-slate-100 p-4 flex flex-col relative min-h-0">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <select
                      value={uploadType}
                      onChange={(e) => {
                        setUploadType(e.target.value);
                        const doc = selected.documents.find((d) => d.type === e.target.value);
                        if (doc) {
                          setSelectedDocId(doc.id);
                          setDocFields({ ...doc.extractedFields });
                        }
                      }}
                      className="text-xs bg-white border border-slate-300 rounded px-2 py-1 flex-1"
                    >
                      {documentTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    {selected.documents.length > 0 && (
                      <select
                        value={selectedDocId || ''}
                        onChange={(e) => {
                          const doc = selected.documents.find((d) => d.id === e.target.value);
                          setSelectedDocId(e.target.value);
                          if (doc) {
                            setUploadType(doc.type);
                            setDocFields({ ...doc.extractedFields });
                          }
                        }}
                        className="text-xs bg-white border border-slate-300 rounded px-2 py-1 max-w-[140px]"
                      >
                        {selected.documents.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fileName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex-1 bg-white rounded border border-slate-300 shadow-sm relative overflow-hidden flex items-center justify-center min-h-0">
                    {previewInvalidPdf ? (
                      <div className="text-center p-6 text-slate-500 text-xs max-w-xs">
                        <AlertCircle size={32} className="mx-auto mb-2 text-amber-500" />
                        <p className="font-semibold text-slate-700 mb-1">Invalid PDF file</p>
                        <p className="mb-3">
                          &quot;{activeDoc?.fileName}&quot; is not a real PDF (it may be a test/corrupt upload).
                          Delete it and upload a valid PDF.
                        </p>
                        {selected.status !== 'Approved' && selected.status !== 'Rejected' && (
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument()}
                            disabled={submitting}
                            className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            Delete invalid file
                          </button>
                        )}
                      </div>
                    ) : previewUrl && activeDoc?.mimeType.startsWith('image/') ? (
                      <img src={previewUrl} alt={activeDoc.fileName} className="max-h-full max-w-full object-contain" />
                    ) : previewUrl && (activeDoc?.mimeType === 'application/pdf' || activeDoc?.fileName.toLowerCase().endsWith('.pdf')) ? (
                      <iframe title="Document preview" src={previewUrl} className="w-full h-full border-0" />
                    ) : selected.documents.length === 0 ? (
                      <div className="text-center p-6 text-slate-400 text-xs">
                        <UploadCloud size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="mb-3">Upload a document to begin verification</p>
                        <button
                          type="button"
                          onClick={handleUploadClick}
                          disabled={submitting}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Choose file
                        </button>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-slate-400 text-xs">
                        <FileText size={32} className="mx-auto mb-2 opacity-50" />
                        Preview not available for this file type
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Data Panel */}
                <div className="w-1/2 p-4 overflow-y-auto min-h-0">
                  {/* Application Form — counselor completes this */}
                  {selected.status !== 'Approved' && selected.status !== 'Rejected' && (
                    <div className="mb-4 p-3 border border-indigo-200 rounded-lg bg-indigo-50/50 space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-800">Application Form</p>
                        <button
                          type="button"
                          onClick={() => void handleSaveApplicationForm()}
                          disabled={submitting}
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          <Save size={12} /> Save Form
                        </button>
                      </div>
                      {formIncomplete && (
                        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          Only basic enquiry data was copied. Fill in DOB, parent names, and place of birth below.
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <FormInput label="Student Name *" value={formDraft.studentName} onChange={(v) => setFormDraft((p) => ({ ...p, studentName: v }))} />
                        <FormInput label="Date of Birth" type="date" value={formDraft.dateOfBirth} onChange={(v) => setFormDraft((p) => ({ ...p, dateOfBirth: v }))} />
                        <FormInput label="Father's Name" value={formDraft.fatherName} onChange={(v) => setFormDraft((p) => ({ ...p, fatherName: v }))} />
                        <FormInput label="Mother's Name" value={formDraft.motherName} onChange={(v) => setFormDraft((p) => ({ ...p, motherName: v }))} />
                        <FormInput label="Place of Birth" value={formDraft.placeOfBirth} onChange={(v) => setFormDraft((p) => ({ ...p, placeOfBirth: v }))} />
                        <FormInput label="Class" value={formDraft.classApplied} onChange={(v) => setFormDraft((p) => ({ ...p, classApplied: v }))} />
                        <FormInput label="Mobile" value={formDraft.mobile} onChange={(v) => setFormDraft((p) => ({ ...p, mobile: v }))} />
                        <FormInput label="Email" value={formDraft.email} onChange={(v) => setFormDraft((p) => ({ ...p, email: v }))} />
                      </div>
                      <FormInput label="Address" value={formDraft.address} onChange={(v) => setFormDraft((p) => ({ ...p, address: v }))} />
                    </div>
                  )}

                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                    Document vs Application Form
                    <span className="text-[10px] font-normal text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      Verification: {selected.verificationScore}%
                    </span>
                  </h4>

                  <div className="space-y-3">
                    {selected.verificationFields.map((field) => (
                      <DataField key={field.key} field={field} />
                    ))}
                  </div>

                  {activeDoc && selected.status !== 'Approved' && selected.status !== 'Rejected' && (
                    <div className="mt-4 p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                      <p className="text-xs font-semibold text-slate-700">Document field values</p>
                      {['studentName', 'dateOfBirth', 'fatherName', 'placeOfBirth'].map((key) => (
                        <div key={key}>
                          <label className="text-[10px] text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                          <input
                            value={docFields[key] || ''}
                            onChange={(e) => setDocFields((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="w-full mt-0.5 px-2 py-1 text-xs border border-slate-300 rounded"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => void handleSaveDocFields()}
                        disabled={submitting}
                        className="w-full mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Update Document Values
                      </button>
                    </div>
                  )}

                  {selected.mismatches.length > 0 && selected.status !== 'Approved' && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex gap-2">
                        <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-amber-800">Review Required</h5>
                          <p className="text-[10px] text-amber-700 mt-1">
                            {selected.mismatches.length} mismatch(es) between uploaded documents and the
                            application form. Review before approving.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selected.entranceTestScore == null && selected.status !== 'Approved' && selected.status !== 'Rejected' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-[10px] text-blue-800">
                      Entrance test merit score must be recorded before the principal can approve admission.
                    </div>
                  )}

                  {selected.rejectionRemarks && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      <strong>Rejection remarks:</strong> {selected.rejectionRemarks}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectOpen && selected && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Reject Application</h2>
              <p className="text-xs text-slate-500 mt-1">{selected.studentName} — {selected.applicationId}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks *</label>
                <textarea
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  rows={4}
                  required
                  placeholder="Reason for rejection (required)..."
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRejectOpen(false);
                    setRejectRemarks('');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleReject()}
                  disabled={submitting || !rejectRemarks.trim()}
                  className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-0.5 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
      />
    </div>
  );
}

function DataField({
  field,
}: {
  field: { label: string; formValue: string; documentValue: string; match: boolean };
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
      <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center">
        <span className="font-semibold text-slate-700">{field.label}</span>
        {field.match ? (
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle size={12} /> Match
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <AlertCircle size={12} /> Mismatch
          </span>
        )}
      </div>
      <div className="p-3 grid grid-cols-2 gap-4 bg-white">
        <div>
          <div className="text-[10px] text-slate-400 mb-1">Document Value</div>
          <div className="font-medium text-slate-800">{field.documentValue || '—'}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 mb-1">Application Form</div>
          <div className="font-medium text-slate-800">{field.formValue || '—'}</div>
        </div>
      </div>
    </div>
  );
}
