"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type StudyPromptAttachment = {
  name: string;
  mimeType: string;
  encoding: "text" | "base64";
  content: string;
};

type StoredMaterial = {
  id: string;
  ownerId: string;
  name: string;
  mimeType: string;
  size: number;
  addedAt: string;
  blob: Blob;
};

type StudyMaterialsProps = {
  onSelectedForAIChange: (attachments: StudyPromptAttachment[]) => void;
};

const databaseName = "athleteiq-study-materials-v1";
const storeName = "materials";
const maxStoredFiles = 8;
const maxSelectedFiles = 2;
const maxFileSize = 1_000_000;

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local study storage."));
  });
}

async function getAllMaterials(): Promise<StoredMaterial[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => { database.close(); resolve(request.result as StoredMaterial[]); };
    request.onerror = () => { database.close(); reject(request.error ?? new Error("Could not read local study files.")); };
  });
}

async function saveMaterial(material: StoredMaterial) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(material);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Could not save this file.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Could not save this file.")); };
  });
}

async function deleteMaterial(id: string) {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).delete(id);
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Could not remove this file.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Could not remove this file.")); };
  });
}

function getMimeType(file: File) {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "md") return "text/markdown";
  if (extension === "txt") return "text/plain";
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "";
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const separator = result.indexOf(",");
      if (separator < 0) reject(new Error("Couldn’t prepare this file for Gemini."));
      else resolve(result.slice(separator + 1));
    };
    reader.onerror = () => reject(new Error("Couldn’t read this file."));
    reader.readAsDataURL(blob);
  });
}

async function prepareAttachment(material: StoredMaterial): Promise<StudyPromptAttachment> {
  if (material.mimeType === "text/plain" || material.mimeType === "text/markdown") {
    const content = await material.blob.text();
    if (!content.trim() || content.length > 100_000) throw new Error(`${material.name} is empty or too large to include.`);
    return { name: material.name, mimeType: material.mimeType, encoding: "text", content };
  }
  return { name: material.name, mimeType: material.mimeType, encoding: "base64", content: await blobToBase64(material.blob) };
}

export default function StudyMaterials({ onSelectedForAIChange }: StudyMaterialsProps) {
  const [ownerId, setOwnerId] = useState("guest");
  const [materials, setMaterials] = useState<StoredMaterial[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const nextOwnerId = user?.id ?? "guest";
        const allMaterials = await getAllMaterials();
        if (!active) return;
        setOwnerId(nextOwnerId);
        setMaterials(allMaterials.filter((material) => material.ownerId === nextOwnerId).sort((a, b) => b.addedAt.localeCompare(a.addedAt)));
      } catch {
        if (active) setMessage("Your browser couldn’t open local file storage.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setMessage("");
    if (!files.length) return;
    if (materials.length + files.length > maxStoredFiles) {
      setMessage(`Keep up to ${maxStoredFiles} study files on this device. Remove a file before adding more.`);
      return;
    }

    const accepted: StoredMaterial[] = [];
    for (const file of files) {
      const mimeType = getMimeType(file);
      const supported = ["text/plain", "text/markdown", "application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mimeType);
      if (!supported) { setMessage(`${file.name} isn’t a supported file type.`); return; }
      if (file.size > maxFileSize) { setMessage(`${file.name} is over the 1 MB per-file limit.`); return; }
      accepted.push({
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ownerId,
        name: file.name.slice(0, 120),
        mimeType,
        size: file.size,
        addedAt: new Date().toISOString(),
        blob: file,
      });
    }

    try {
      for (const material of accepted) await saveMaterial(material);
      setMaterials((current) => [...accepted.reverse(), ...current]);
      setIsAdding(false);
      setMessage(`${accepted.length} ${accepted.length === 1 ? "file" : "files"} saved in this browser.`);
    } catch {
      setMessage("Couldn’t save those files in this browser. Check available device storage and try again.");
    }
  }

  async function removeFile(material: StoredMaterial) {
    try {
      await deleteMaterial(material.id);
      const nextMaterials = materials.filter((item) => item.id !== material.id);
      setMaterials(nextMaterials);
      const nextIds = selectedIds.filter((id) => id !== material.id);
      if (nextIds.length !== selectedIds.length) {
        setSelectedIds(nextIds);
        onSelectedForAIChange(await Promise.all(nextMaterials.filter((item) => nextIds.includes(item.id)).map(prepareAttachment)));
      }
      setMessage(`${material.name} removed from this browser.`);
    } catch {
      setMessage("Couldn’t remove that file from this browser.");
    }
  }

  async function toggleForAI(material: StoredMaterial, checked: boolean) {
    setMessage("");
    let nextIds: string[];
    if (checked) {
      if (selectedIds.length >= maxSelectedFiles) {
        setMessage(`Choose up to ${maxSelectedFiles} files for one plan.`);
        return;
      }
      nextIds = [...selectedIds, material.id];
    } else {
      nextIds = selectedIds.filter((id) => id !== material.id);
    }
    try {
      const chosen = materials.filter((item) => nextIds.includes(item.id));
      const attachments = await Promise.all(chosen.map(prepareAttachment));
      setSelectedIds(nextIds);
      onSelectedForAIChange(attachments);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn’t prepare the selected file.");
    }
  }

  function downloadFile(material: StoredMaterial) {
    const url = URL.createObjectURL(material.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = material.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-bold text-slate-900">Study Materials</h3><p className="mt-1 text-xs leading-5 text-slate-500">Add notes, PDFs, or images. Files stay in this browser by default.</p></div>
        <button type="button" onClick={() => { setMessage(""); setIsAdding((value) => !value); }} className="shrink-0 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50">{isAdding ? "Cancel" : "+ Add files"}</button>
      </div>

      {isAdding && <div className="mt-4 rounded-xl bg-slate-50 p-3"><label className="block text-sm font-semibold text-slate-700">Choose text, Markdown, PDF, or image files<input type="file" multiple accept=".txt,.md,.pdf,.jpg,.jpeg,.png,.webp,text/plain,text/markdown,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => void handleFiles(event)} className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-bold file:text-indigo-700" /></label><p className="mt-2 text-xs text-slate-500">Up to {maxStoredFiles} files, 1 MB each. Saved only in this browser on this device.</p></div>}

      {isLoading ? <p className="mt-4 text-sm text-slate-500">Loading your local files…</p> : materials.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">Your study shelf is empty.</p> : <ul className="mt-4 space-y-2">{materials.map((material) => <li key={material.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
        <span className="mt-0.5 text-lg" aria-hidden="true">{material.mimeType.startsWith("image/") ? "🖼️" : material.mimeType === "application/pdf" ? "📄" : "📝"}</span>
        <div className="min-w-0 flex-1"><p className="break-all text-sm font-semibold text-slate-800">{material.name}</p><p className="text-xs text-slate-500">{(material.size / 1024).toFixed(0)} KB · Saved on this device</p><label className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={selectedIds.includes(material.id)} onChange={(event) => void toggleForAI(material, event.target.checked)} className="mt-1 accent-indigo-600" />Use in my next Gemini plan</label></div>
        <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => downloadFile(material)} aria-label={`Download ${material.name}`} className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-white">Download</button><button type="button" onClick={() => void removeFile(material)} aria-label={`Remove ${material.name}`} className="rounded-lg px-2 text-lg leading-6 text-slate-400 hover:bg-white hover:text-rose-600">×</button></div>
      </li>)}</ul>}

      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-950">Files stay in this browser unless you select one for a plan. Selected file contents are sent to Google Gemini when you submit the plan. Review files for personal information first. Up to {maxSelectedFiles} files can be included in one plan.</p>
      {selectedIds.length > 0 && <p className="mt-2 text-xs font-semibold text-indigo-700">{selectedIds.length} file{selectedIds.length === 1 ? "" : "s"} selected for the next plan.</p>}
      {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
    </div>
  );
}
