import { useEffect, useRef, useState } from "react";
import { animeOffline } from "./localAnime";

interface Props {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  /** Hand the generated portrait to the face editor (auto face + hair crop). */
  onUse: (file: File) => void;
  onClose: () => void;
}

/**
 * ✨ AI anime avatar: upload your own photo and an AI model redraws you as an anime character.
 * Default: fully offline, on this computer (no key, no internet, free).
 * Optional: a cloud model (OpenAI, the user's own key) that also follows a prompt (outfit, accessories…).
 */
export default function AiAvatarPanel({
  prompt,
  onPromptChange,
  onUse,
  onClose,
}: Props) {
  const [mode, setMode] = useState<"offline" | "cloud">("offline");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [note, setNote] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.waterBuddy.aiHasKey().then(setHasKey);
  }, []);
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const saveKey = async () => {
    setError("");
    try {
      const where = await window.waterBuddy.aiSetKey(keyDraft.trim());
      setKeyDraft("");
      setHasKey(true);
      setNote(
        where === "session"
          ? "No secure key storage on this computer: the key is kept only until WaterBuddy quits."
          : "Key saved securely.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/^.*Error: /, "")
          : "Could not save the key.",
      );
    }
  };

  const generate = async () => {
    if (!photo) return;
    setBusy(true);
    setError("");
    setResult("");
    if (mode === "offline") {
      try {
        setResult(await animeOffline(photo));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
      setBusy(false);
      return;
    }
    const res = await window.waterBuddy.aiGenerate({
      image: await photo.arrayBuffer(),
      mime: photo.type,
      prompt,
    });
    setBusy(false);
    if (res.ok && res.dataUrl) setResult(res.dataUrl);
    else setError(res.error ?? "Something went wrong.");
  };

  const use = async () => {
    const blob = await (await fetch(result)).blob();
    onUse(new File([blob], "anime-avatar.png", { type: "image/png" }));
  };

  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-sky-50 p-4 ring-1 ring-fuchsia-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">
          ✨ AI anime avatar from your photo
        </h3>
        <button
          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="flex rounded-full bg-white p-1 text-xs font-semibold ring-1 ring-slate-200">
        {(
          [
            ["offline", "💻 On this computer (free, offline)"],
            ["cloud", "☁️ Cloud AI (your OpenAI key)"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            className={`flex-1 rounded-full px-3 py-1.5 ${mode === m ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            onClick={() => {
              setMode(m);
              setResult("");
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "offline" && (
        <p className="text-xs text-slate-600">
          An anime AI model built into WaterBuddy redraws your photo right here:{" "}
          <b>no internet, no API key, no cost</b>. Your face is found and framed
          automatically. Pick clothes and accessories for your buddy in{" "}
          <b>Outfit &amp; accessories</b> afterwards.
        </p>
      )}

      {mode === "cloud" && hasKey === false && (
        <div className="space-y-2 rounded-xl bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          <p>
            This uses an AI image model (OpenAI <b>gpt-image-1</b>) with{" "}
            <b>your own API key</b>. The key is stored encrypted on this
            computer. Create one at platform.openai.com → API keys. Generating
            an image is billed to your OpenAI account.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="sk-…"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              aria-label="OpenAI API key"
            />
            <button
              className="rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white disabled:opacity-40"
              disabled={!keyDraft.trim()}
              onClick={saveKey}
            >
              Save key
            </button>
          </div>
        </div>
      )}

      {mode === "cloud" && (
        <label className="block text-xs font-semibold text-slate-600">
          Prompt
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-normal text-slate-700"
          />
        </label>
      )}

      <div className="flex items-start gap-3">
        <button
          onClick={() => input.current?.click()}
          className="grid h-28 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white text-xs text-slate-500 hover:border-sky-400"
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Your photo"
              className="h-full w-full object-cover"
            />
          ) : (
            <span>
              📷
              <br />
              Upload your photo
            </span>
          )}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) {
              setPhoto(f);
              setResult("");
            }
          }}
        />
        <div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-center text-[11px] text-slate-400 ring-1 ring-slate-200">
          {busy ? (
            <span className="animate-pulse">
              Drawing your
              <br />
              anime self…
              <br />
              {mode === "offline" ? "(a few seconds)" : "(up to a minute)"}
            </span>
          ) : result ? (
            <img
              src={result}
              alt="Generated anime avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            "Result"
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <button
            className="w-full rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-40"
            disabled={
              !photo ||
              busy ||
              (mode === "cloud" && (!hasKey || !prompt.trim()))
            }
            onClick={generate}
          >
            {busy ? "Generating…" : result ? "↻ Generate again" : "✨ Generate"}
          </button>
          {result && (
            <button
              className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={use}
            >
              Use as my face →
            </button>
          )}
          {mode === "cloud" && hasKey && (
            <button
              className="text-[11px] text-slate-500 underline"
              onClick={async () => {
                await window.waterBuddy.aiSetKey(null);
                setHasKey(false);
              }}
            >
              Remove saved API key
            </button>
          )}
        </div>
      </div>
      {note && !error && <p className="text-xs text-emerald-700">{note}</p>}
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <p className="text-[11px] leading-snug text-slate-500">
        {mode === "offline"
          ? "🔒 Your photo never leaves this computer."
          : "🔒 Your photo is sent to OpenAI only when you press Generate, to create the image. Nothing is uploaded otherwise."}{" "}
        The result is cropped to face and hair and placed on your buddy; you can
        adjust the crop next.
      </p>
    </div>
  );
}
