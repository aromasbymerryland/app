"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Link2, Star, Trash2 } from "lucide-react";
import type { ProductImage } from "@/lib/catalog";

type GalleryEntry =
  | { id: string; kind: "url"; url: string; alt: string; storagePath?: string | null }
  | { id: string; kind: "file"; fileIndex: number; preview: string; alt: string };

export function AdminImageManager({ images = [] }: { images?: ProductImage[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<GalleryEntry[]>(
    images.map((image, index) => ({
      id: `existing-${index}`,
      kind: "url",
      url: image.imageUrl,
      alt: image.altText,
      storagePath: image.storagePath,
    })),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [fileError, setFileError] = useState("");
  const manifest = entries.map((entry) =>
    entry.kind === "url"
      ? { kind: entry.kind, url: entry.url, alt: entry.alt, storagePath: entry.storagePath ?? null }
      : { kind: entry.kind, fileIndex: entry.fileIndex, alt: entry.alt },
  );

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const selected = Array.from(fileList);
    const accepted = selected.filter((file) =>
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) && file.size <= 5 * 1024 * 1024,
    );
    const rejectedCount = selected.length - accepted.length;
    if (!inputRef.current) return;
    const available = Math.max(0, 8 - entries.length);
    const additions = accepted.slice(0, available);
    setFileError(
      rejectedCount
        ? "Some files were skipped. Use JPG, PNG, WebP, or AVIF images no larger than 5 MB."
        : additions.length < accepted.length
          ? "A product can have up to 8 images."
          : "",
    );
    if (!additions.length) return;
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    additions.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
    const firstIndex = files.length;
    const nextFiles = [...files, ...additions];
    setFiles(nextFiles);
    setEntries((current) => [
      ...current,
      ...additions.map((file, index) => ({
        id: `upload-${firstIndex + index}`,
        kind: "file" as const,
        fileIndex: firstIndex + index,
        preview: URL.createObjectURL(file),
        alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      })),
    ]);
  }

  function removeEntry(id: string) {
    const target = entries.find((entry) => entry.id === id);
    if (target?.kind === "file") {
      const oldFiles = files;
      const nextFiles = oldFiles.filter((_, index) => index !== target.fileIndex);
      const transfer = new DataTransfer();
      nextFiles.forEach((file) => transfer.items.add(file));
      if (inputRef.current) inputRef.current.files = transfer.files;
      setFiles(nextFiles);
      setEntries((current) =>
        current.filter((entry) => entry.id !== id).map((entry) =>
          entry.kind === "file"
            ? { ...entry, fileIndex: entry.fileIndex > target.fileIndex ? entry.fileIndex - 1 : entry.fileIndex }
            : entry,
        ),
      );
      URL.revokeObjectURL(target.preview);
      return;
    }
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function moveEntry(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= entries.length) return;
    setEntries((current) => {
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function addUrl() {
    if (entries.length >= 8) {
      setUrlError("A product can have up to 8 images.");
      return;
    }
    const url = urlInput.trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") throw new Error("https required");
    } catch {
      setUrlError("Enter a valid image URL beginning with https://.");
      return;
    }
    if (entries.some((entry) => entry.kind === "url" && entry.url === url)) {
      setUrlError("That image is already in this gallery.");
      return;
    }
    setEntries((current) => [...current, { id: `url-${crypto.randomUUID()}`, kind: "url", url, alt: "" }]);
    setUrlInput("");
    setUrlError("");
  }

  function updateAlt(id: string, alt: string) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, alt } : entry)));
  }

  return (
    <section className="admin-image-manager">
      <input type="hidden" name="imageManifest" value={JSON.stringify(manifest)} />
      <label className="admin-form-wide admin-image-label">
        Product gallery
        <span>Add images by dropping files here or selecting them. Add URLs below if the image is hosted elsewhere.</span>
      </label>
      <label
        className="admin-drop-zone admin-form-wide"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          name="productImages"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(event) => addFiles(event.currentTarget.files)}
        />
        <ImagePlus size={23} />
        <strong>Drop product photos here</strong>
        <span>or browse files · JPG, PNG, WebP, AVIF · up to 5 MB each · up to 8 photos</span>
      </label>
      {fileError && <p className="admin-form-error admin-form-wide" role="alert">{fileError}</p>}
      <div className="admin-image-url-row admin-form-wide">
        <label htmlFor="product-image-url"><Link2 size={15} /> Add an image URL</label>
        <div><input id="product-image-url" type="url" value={urlInput} onChange={(event) => setUrlInput(event.target.value)} placeholder="https://example.com/product-image.webp" /><button type="button" onClick={addUrl}>Add URL</button></div>
        {urlError && <p className="admin-form-error" role="alert">{urlError}</p>}
      </div>
      {entries.length > 0 && (
        <ol className="admin-gallery-list admin-form-wide">
          {entries.map((entry, index) => {
            const src = entry.kind === "url" ? entry.url : entry.preview;
            return (
              <li key={entry.id} className="admin-gallery-item">
                <div className="admin-gallery-thumb">
                  <Image src={src} alt={entry.alt || "Product gallery preview"} fill sizes="88px" unoptimized />
                </div>
                <div className="admin-gallery-fields">
                  <div className="admin-gallery-title">
                    <strong>{index === 0 ? <><Star size={13} fill="currentColor" /> Primary image</> : `Gallery image ${index + 1}`}</strong>
                    <span>{entry.kind === "file" ? "Upload" : "Image URL"}</span>
                  </div>
                  <label>Image description<input value={entry.alt} maxLength={240} onChange={(event) => updateAlt(entry.id, event.target.value)} placeholder="Describe the product image" /></label>
                </div>
                <div className="admin-gallery-actions">
                  <button type="button" disabled={index === 0} onClick={() => moveEntry(index, -1)} aria-label="Move image up"><ArrowUp size={15} /></button>
                  <button type="button" disabled={index === entries.length - 1} onClick={() => moveEntry(index, 1)} aria-label="Move image down"><ArrowDown size={15} /></button>
                  <button type="button" onClick={() => removeEntry(entry.id)} aria-label="Remove image"><Trash2 size={15} /></button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="admin-gallery-hint admin-form-wide">The first image is used as the product card image. Use the arrows to change its position. You can add up to 8 images per product.</p>
    </section>
  );
}
