"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { Folder, FileText, Plus, MoreVertical, Trash2, Edit2, Search, Upload, Download, FileArchive, FolderMinus } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteStudentFileAction,
  deleteStudentFileFolderAction,
  saveStudentFileAction,
  saveStudentFileFolderAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";
import type { StudentFileInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type FileRecord = {
  id: string;
  title: string;
  category: StudentFileInput["category"];
  fileName: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  notes: string | null;
  documentDate: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  folder: {
    id: string;
    name: string;
  } | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom?: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

type FolderRecord = {
  id: string;
  name: string;
  fileCount: number;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
};

function formatFileSize(value?: number | null) {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function buildFileHref(file: FileRecord) {
  if (file.mimeType || file.fileSize) {
    return `/api/student-files/${file.id}`;
  }
  return file.fileUrl;
}

export function StudentFileManager({
  canManage,
  students,
  folders,
  files,
}: {
  canManage: boolean;
  students: StudentOption[];
  folders: FolderRecord[];
  files: FileRecord[];
}) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [isPending, startTransition] = useTransition();

  // Search & Filter
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("tr-TR"));

  // Selectors for auto upload
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? "");
  const [selectedFolderId, setSelectedFolderId] = useState("");

  // States for folder management
  const [activeDropdownFolderId, setActiveDropdownFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // States for file renaming
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingFileTitle, setEditingFileTitle] = useState("");

  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  const [draggedOverFolderId, setDraggedOverFolderId] = useState<string | null>(null);
  const [isOverFileList, setIsOverFileList] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isOverRootBreadcrumb, setIsOverRootBreadcrumb] = useState(false);

  const filteredFiles = files.filter((file) => {
    if (activeFolderId && file.folder?.id !== activeFolderId) {
      return false;
    }
    if (!deferredSearch) return true;
    return (
      file.title.toLocaleLowerCase("tr-TR").includes(deferredSearch) ||
      (file.student ? `${file.student.firstName} ${file.student.lastName}` : "")
        .toLocaleLowerCase("tr-TR")
        .includes(deferredSearch) ||
      (file.folder?.name ?? "").toLocaleLowerCase("tr-TR").includes(deferredSearch)
    );
  });

  const uploadFile = async (file: File) => {
    if (!selectedStudentId) {
      alert("Lütfen önce bir öğrenci seçin.");
      return;
    }

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? "").split(",")[1]);
      reader.onerror = () => reject(new Error("Dosya okunamadı."));
      reader.readAsDataURL(file);
    });

    startTransition(async () => {
      const result = await saveStudentFileAction({
        studentId: selectedStudentId,
        folderId: activeFolderId || selectedFolderId || undefined,
        title: file.name.replace(/\.[^.]+$/, ""),
        category: "other",
        fileName: file.name,
        uploadedBase64: base64,
        uploadedFileName: file.name,
        uploadedMimeType: file.type || "application/octet-stream",
      });

      showResult(result, {
        successTitle: "Belge eklendi",
        errorTitle: "Belge eklenemedi",
      });

      if (result.success) {
        router.refresh();
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleFileRename = (file: FileRecord) => {
    if (!editingFileTitle.trim() || editingFileTitle.trim() === file.title) {
      setEditingFileId(null);
      return;
    }

    const studentId = file.student?.id;
    if (!studentId) {
      setEditingFileId(null);
      return;
    }

    startTransition(async () => {
      const result = await saveStudentFileAction({
        id: file.id,
        studentId,
        folderId: file.folder?.id || undefined,
        title: editingFileTitle.trim(),
        category: file.category,
        fileName: file.fileName || "",
        notes: file.notes || undefined,
      });

      showResult(result, {
        successTitle: "Dosya adı güncellendi",
        errorTitle: "Dosya adı güncellenemedi",
      });

      if (result.success) {
        setEditingFileId(null);
        router.refresh();
      }
    });
  };

  const handleFolderRename = (folderId: string) => {
    if (!editingFolderName.trim()) {
      setEditingFolderId(null);
      return;
    }

    startTransition(async () => {
      const result = await saveStudentFileFolderAction({
        id: folderId,
        name: editingFolderName.trim(),
      });

      showResult(result, {
        successTitle: "Klasör adı güncellendi",
        errorTitle: "Klasör adı güncellenemedi",
      });

      if (result.success) {
        setEditingFolderId(null);
        router.refresh();
      }
    });
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    setActiveDropdownFolderId(null);
    const confirmed = await confirmModal({
      title: "Klasörü Sil",
      message: `"${folderName}" isimli klasörü silmek istediğinize emin misiniz? Bu işlem klasör altındaki tüm belgeleri de kaldırabilir.`,
      variant: "danger",
      confirmText: "Kalıcı Olarak Sil",
      cancelText: "Vazgeç",
    });

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteStudentFileFolderAction({ id: folderId });
      showResult(result, {
        successTitle: "Klasör silindi",
        errorTitle: "Klasör silinemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    startTransition(async () => {
      const result = await saveStudentFileFolderAction({
        name: newFolderName.trim(),
      });

      showResult(result, {
        successTitle: "Klasör oluşturuldu",
        errorTitle: "Klasör oluşturulamadı",
      });

      if (result.success) {
        setNewFolderName("");
        setIsNewFolderModalOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-6">
      {/* Search & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <input
            className={cn(inputClassName(), "pl-10")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Belge veya klasör ara..."
          />
        </div>

        {canManage && (
          <Button onClick={() => setIsNewFolderModalOpen(true)} className="flex items-center gap-1.5 self-start sm:self-auto">
            <Plus className="size-4" />
            Yeni Klasör
          </Button>
        )}
      </div>

      {/* Upload Zone & Selectors */}
      {canManage && (
        <div className="grid gap-4 md:grid-cols-[250px_250px_1fr]">
          <Field label="Öğrenci Seçin">
            <select
              className={inputClassName()}
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Klasör Seçin">
            <select
              className={inputClassName()}
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
            >
              <option value="">Klasörsüz</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </Field>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isDragging
                ? "border-[color:var(--panel-border-strong)] bg-[color:var(--panel-bg-hover)]"
                : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]"
            }`}
          >
            <input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await uploadFile(file);
                e.target.value = "";
              }}
              className="hidden"
              id="file-upload-picker"
            />
            <Upload className="size-8 text-[color:var(--panel-text-soft)] mb-2" />
            <div className="text-sm text-[color:var(--panel-text)]">
              <span className="font-semibold cursor-pointer text-sky-400 hover:underline" onClick={() => document.getElementById("file-upload-picker")?.click()}>
                Dosya seçin
              </span>{" "}
              veya buraya sürükleyin
            </div>
          </div>
        </div>
      )}

      {/* Folders Grid */}
      {activeFolderId === null && folders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => {
            const isEditing = editingFolderId === folder.id;

            return (
              <div
                key={folder.id}
                onClick={() => {
                  if (!isEditing) {
                    setActiveFolderId(folder.id);
                    setSelectedFolderId(folder.id);
                  }
                }}
                onDragOver={(e) => {
                  if (canManage) {
                    e.preventDefault();
                    setDraggedOverFolderId(folder.id);
                  }
                }}
                onDragLeave={() => {
                  if (canManage) {
                    setDraggedOverFolderId(null);
                  }
                }}
                onDrop={async (e) => {
                  if (canManage) {
                    e.preventDefault();
                    setDraggedOverFolderId(null);
                    const fileId = e.dataTransfer.getData("text/plain");
                    if (!fileId) return;

                    const targetFile = files.find((f) => f.id === fileId);
                    if (!targetFile) return;

                    if (targetFile.folder?.id === folder.id) return;

                    const studentId = targetFile.student?.id;
                    if (!studentId) return;

                    startTransition(async () => {
                      const result = await saveStudentFileAction({
                        id: targetFile.id,
                        studentId,
                        folderId: folder.id,
                        title: targetFile.title,
                        category: targetFile.category,
                        fileName: targetFile.fileName || "",
                        notes: targetFile.notes || undefined,
                      });

                      showResult(result, {
                        successTitle: "Belge klasöre taşındı",
                        errorTitle: "Belge klasöre taşınamadı",
                      });

                      if (result.success) {
                        router.refresh();
                      }
                    });
                  }
                }}
                className={cn(
                  "relative flex items-center justify-between rounded-xl border p-4 transition cursor-pointer select-none",
                  draggedOverFolderId === folder.id
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] hover:border-[color:var(--panel-border-strong)]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Folder className="size-6 text-sky-400 shrink-0" />
                  {isEditing ? (
                    <input
                      className={cn(inputClassName(), "py-0.5 px-2 text-sm")}
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => handleFolderRename(folder.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFolderRename(folder.id);
                        if (e.key === "Escape") setEditingFolderId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate text-[color:var(--panel-text)]">
                        {folder.name}
                      </div>
                      <div className="text-xs text-[color:var(--panel-text-muted)]">
                        {folder.fileCount} dosya
                      </div>
                    </div>
                  )}
                </div>

                {canManage && !isEditing && (
                  <div className="relative shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setActiveDropdownFolderId(activeDropdownFolderId === folder.id ? null : folder.id)}
                    >
                      <MoreVertical className="size-4" />
                    </Button>

                    {activeDropdownFolderId === folder.id && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setActiveDropdownFolderId(null)}
                        />
                        <div className="absolute right-0 top-8 z-20 w-32 rounded-lg border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-1 shadow-lg">
                          <button
                            type="button"
                            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[color:var(--panel-text)] hover:bg-[color:var(--panel-bg-hover)]"
                            onClick={() => {
                              setEditingFolderId(folder.id);
                              setEditingFolderName(folder.name);
                              setActiveDropdownFolderId(null);
                            }}
                          >
                            <Edit2 className="size-3.5" />
                            Ad Değiştir
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[color:var(--panel-danger-text)] hover:bg-[color:var(--panel-danger-bg)] hover:text-white"
                            onClick={() => handleDeleteFolder(folder.id, folder.name)}
                          >
                            <Trash2 className="size-3.5" />
                            Sil
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Breadcrumb Navigation when inside a folder */}
      {activeFolderId !== null && (
        <div className="flex items-center gap-2 text-sm text-[color:var(--panel-text-soft)] font-medium">
          <button
            type="button"
            onDragOver={(e) => {
              if (canManage) {
                e.preventDefault();
                setIsOverRootBreadcrumb(true);
              }
            }}
            onDragLeave={() => {
              if (canManage) {
                setIsOverRootBreadcrumb(false);
              }
            }}
            onDrop={(e) => {
              if (canManage) {
                e.preventDefault();
                setIsOverRootBreadcrumb(false);
                const fileId = e.dataTransfer.getData("text/plain");
                if (!fileId) return;

                const targetFile = files.find((f) => f.id === fileId);
                if (!targetFile) return;

                if (!targetFile.folder) return;

                const studentId = targetFile.student?.id;
                if (!studentId) return;

                startTransition(async () => {
                  const result = await saveStudentFileAction({
                    id: targetFile.id,
                    studentId,
                    folderId: undefined,
                    title: targetFile.title,
                    category: targetFile.category,
                    fileName: targetFile.fileName || "",
                    notes: targetFile.notes || undefined,
                  });

                  showResult(result, {
                    successTitle: "Belge klasörden çıkarıldı",
                    errorTitle: "Belge klasörden çıkarılamadı",
                  });

                  if (result.success) {
                    router.refresh();
                  }
                });
              }
            }}
            onClick={() => {
              setActiveFolderId(null);
              setSelectedFolderId("");
            }}
            className={cn(
              "px-2.5 py-1 rounded-lg transition border border-transparent",
              isOverRootBreadcrumb
                ? "bg-sky-500/20 text-sky-400 border-dashed border-sky-500"
                : "hover:text-[color:var(--panel-text)] hover:bg-[color:var(--panel-bg-hover)]"
            )}
          >
            Tüm Belgeler
          </button>
          <span>/</span>
          <span className="text-[color:var(--panel-text)] font-semibold px-1">
            {folders.find((f) => f.id === activeFolderId)?.name || "Klasör"}
          </span>
        </div>
      )}

      {/* Files List */}
      <div
        onDragOver={(e) => {
          if (canManage) {
            e.preventDefault();
            setIsOverFileList(true);
          }
        }}
        onDragLeave={() => {
          if (canManage) {
            setIsOverFileList(false);
          }
        }}
        onDrop={(e) => {
          if (canManage) {
            e.preventDefault();
            setIsOverFileList(false);
            const fileId = e.dataTransfer.getData("text/plain");
            if (!fileId) return;

            const targetFile = files.find((f) => f.id === fileId);
            if (!targetFile) return;

            if (!targetFile.folder) return;

            const studentId = targetFile.student?.id;
            if (!studentId) return;

            startTransition(async () => {
              const result = await saveStudentFileAction({
                id: targetFile.id,
                studentId,
                folderId: undefined,
                title: targetFile.title,
                category: targetFile.category,
                fileName: targetFile.fileName || "",
                notes: targetFile.notes || undefined,
              });

              showResult(result, {
                successTitle: "Belge klasörden çıkarıldı",
                errorTitle: "Belge klasörden çıkarılamadı",
              });

              if (result.success) {
                router.refresh();
              }
            });
          }
        }}
        className={cn(
          "rounded-2xl border overflow-hidden transition",
          isOverFileList
            ? "border-sky-500 bg-sky-500/5"
            : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]"
        )}
      >
        <div className="divide-y divide-[color:var(--panel-border)]">
          {filteredFiles.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[color:var(--panel-text-soft)]">
              Görüntülenecek dosya yok.
            </div>
          ) : (
            filteredFiles.map((file) => {
              const fileHref = buildFileHref(file);
              const isEditingFile = editingFileId === file.id;

              return (
                <div
                  key={file.id}
                  draggable={canManage}
                  onDragStart={(e) => {
                    if (canManage) {
                      e.dataTransfer.setData("text/plain", file.id);
                      e.dataTransfer.effectAllowed = "move";
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-[color:var(--panel-bg-hover)] transition",
                    canManage ? "cursor-grab active:cursor-grabbing" : ""
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="size-6 text-neutral-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {isEditingFile ? (
                        <input
                          className={cn(inputClassName(), "py-0.5 px-2 text-sm w-full max-w-md")}
                          value={editingFileTitle}
                          onChange={(e) => setEditingFileTitle(e.target.value)}
                          onBlur={() => handleFileRename(file)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleFileRename(file);
                            if (e.key === "Escape") setEditingFileId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <div
                          className="font-semibold text-sm text-[color:var(--panel-text)] cursor-pointer hover:text-sky-400 transition truncate"
                          onClick={() => {
                            if (canManage) {
                              setEditingFileId(file.id);
                              setEditingFileTitle(file.title);
                            }
                          }}
                          title="Adını değiştirmek için tıklayın"
                        >
                          {file.title}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-[color:var(--panel-text-muted)] flex flex-wrap items-center gap-2">
                        <span>
                          {file.student ? `${file.student.firstName} ${file.student.lastName}` : "Öğrenci bağlantısı yok"}
                        </span>
                        <span>·</span>
                        <span>{formatFileSize(file.fileSize)}</span>
                        {file.folder && (
                          <>
                            <span>·</span>
                            <span className="text-sky-400">{file.folder.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {fileHref && (
                      <a href={fileHref} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="size-8" title="Görüntüle / İndir">
                          <Download className="size-4" />
                        </Button>
                      </a>
                    )}
                    {canManage && file.folder && file.student && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[color:var(--panel-text-soft)] hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
                        title="Klasörden Çıkar"
                        onClick={() => {
                          const studentId = file.student?.id;
                          if (!studentId) return;
                          startTransition(async () => {
                            const result = await saveStudentFileAction({
                              id: file.id,
                              studentId,
                              folderId: undefined,
                              title: file.title,
                              category: file.category,
                              fileName: file.fileName || "",
                              notes: file.notes || undefined,
                            });

                            showResult(result, {
                              successTitle: "Belge klasörden çıkarıldı",
                              errorTitle: "Belge klasörden çıkarılamadı",
                            });

                            if (result.success) {
                              router.refresh();
                            }
                          });
                        }}
                      >
                        <FolderMinus className="size-4" />
                      </Button>
                    )}

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-[color:var(--panel-danger-text)] hover:bg-[color:var(--panel-danger-bg)] hover:text-white"
                        onClick={async () => {
                          const confirmed = await confirmModal({
                            title: "Belgeyi Sil",
                            message: `"${file.title}" isimli dosyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                            variant: "danger",
                            confirmText: "Kalıcı Olarak Sil",
                            cancelText: "Vazgeç",
                          });

                          if (!confirmed) return;

                          startTransition(async () => {
                            const result = await deleteStudentFileAction({ id: file.id });
                            showResult(result, {
                              successTitle: "Belge silindi",
                              errorTitle: "Belge silinemedi",
                            });
                            if (result.success) {
                              router.refresh();
                            }
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[color:var(--panel-text)] mb-3">Yeni Klasör Oluştur</h3>
            <input
              className={cn(inputClassName(), "w-full mb-4")}
              placeholder="Klasör adı girin..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFolder();
                if (e.key === "Escape") setIsNewFolderModalOpen(false);
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsNewFolderModalOpen(false)}>
                Vazgeç
              </Button>
              <Button size="sm" onClick={handleCreateFolder} disabled={isPending || !newFolderName.trim()}>
                Oluştur
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
