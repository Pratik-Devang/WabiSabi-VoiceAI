"use client";

import { FormEvent, useState } from "react";
import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import {
  deleteSession,
  renameSession,
  type VoiceSession
} from "@/lib/session-store";

type Props = {
  accountEmail: string;
  session: VoiceSession;
  onRenamed: (session: VoiceSession) => void;
  onDeleted: (sessionId: string) => void;
};

export default function SessionActions({
  accountEmail,
  session,
  onRenamed,
  onDeleted
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [title, setTitle] = useState(session.title);

  function stop(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  function openDialog(type: "rename" | "delete") {
    setMenuOpen(false);
    setTitle(session.title);
    setDialog(type);
  }

  function submitRename(event: FormEvent) {
    event.preventDefault();
    const updated = renameSession(accountEmail, session.id, title);
    if (updated) {
      onRenamed(updated);
      setDialog(null);
    }
  }

  function confirmDelete() {
    if (deleteSession(accountEmail, session.id)) {
      onDeleted(session.id);
      setDialog(null);
    }
  }

  return (
    <div className="session-actions" onClick={stop} onKeyDown={stop}>
      <button
        className="session-actions-trigger"
        aria-label={`Options for ${session.title}`}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <MoreHorizontal size={17} />
      </button>

      {menuOpen && (
        <div className="session-actions-menu">
          <button onClick={() => openDialog("rename")}>
            <Pencil size={14} /> Rename
          </button>
          <button className="danger" onClick={() => openDialog("delete")}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}

      {dialog && (
        <div className="session-dialog-backdrop" onClick={() => setDialog(null)}>
          <section className="session-dialog" onClick={stop} role="dialog" aria-modal="true">
            <header>
              <div>
                <p>{dialog === "rename" ? "Edit conversation" : "Delete conversation"}</p>
                <h2>{dialog === "rename" ? "Rename this chat" : "Delete this chat?"}</h2>
              </div>
              <button onClick={() => setDialog(null)} aria-label="Close"><X size={17} /></button>
            </header>

            {dialog === "rename" ? (
              <form onSubmit={submitRename}>
                <label>
                  <span>Conversation name</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    autoFocus
                    maxLength={80}
                  />
                </label>
                <div>
                  <button type="button" onClick={() => setDialog(null)}>Cancel</button>
                  <button type="submit" disabled={!title.trim()}>Save name</button>
                </div>
              </form>
            ) : (
              <div className="delete-confirmation">
                <p>
                  “{session.title}” and its complete transcript will be permanently
                  removed from this browser.
                </p>
                <div>
                  <button onClick={() => setDialog(null)}>Keep chat</button>
                  <button className="delete-button" onClick={confirmDelete}>Delete chat</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
