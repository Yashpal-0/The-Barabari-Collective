import { useState, useEffect, useRef } from 'react';
import { getTicket, createTicket, updateTicket, deleteTicket, addComment } from '../api';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const PRIORITY_COLOR = {
  low: 'var(--p-low)', medium: 'var(--p-medium)',
  high: 'var(--p-high)', critical: 'var(--p-critical)',
};

function blank(parentId) {
  return { title: '', description: '', status: 'backlog', priority: 'medium', assignee: '', team_tag: '', parent_id: parentId ? String(parentId) : '' };
}

const fieldStyle = {
  display: 'block',
  width: '100%',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
  padding: '8px 12px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
};

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function TicketModal({ ticket, parentId, onClose, onSaved, onDeleted, onCreateChild, onTicketClick }) {
  const isNew = !ticket;
  const [form, setForm] = useState(
    isNew ? blank(parentId) : {
      title: ticket.title,
      description: ticket.description || '',
      status: ticket.status,
      priority: ticket.priority,
      assignee: ticket.assignee || '',
      team_tag: ticket.team_tag || '',
      parent_id: ticket.parent_id ? String(ticket.parent_id) : '',
    }
  );
  const [detail, setDetail] = useState(null);
  const [commentForm, setCommentForm] = useState({ author: '', body: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (!isNew) {
      getTicket(ticket.id).then(setDetail).catch(() => {});
    }
    setTimeout(() => titleRef.current?.focus(), 50);
  }, [ticket?.id, isNew]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { ...form, parent_id: form.parent_id ? parseInt(form.parent_id) : null };
      if (isNew) {
        const created = await createTicket(payload);
        onSaved(created, true);
      } else {
        const updated = await updateTicket(ticket.id, payload);
        onSaved(updated, false);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ticket #${ticket.id}? This cannot be undone.`)) return;
    try {
      await deleteTicket(ticket.id);
      onDeleted(ticket.id);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleComment(e) {
    e.preventDefault();
    try {
      const comment = await addComment(ticket.id, commentForm);
      setDetail((d) => ({ ...d, comments: [...(d?.comments || []), comment] }));
      setCommentForm({ author: '', body: '' });
    } catch (err) {
      setError(err.message);
    }
  }

  function handleAddChild() {
    onClose();
    onCreateChild(ticket.id);
  }

  function handleChildClick(child) {
    onClose();
    onTicketClick(child);
  }

  const priorityColor = PRIORITY_COLOR[form.priority] || 'var(--border)';

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600,
          maxHeight: '90vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: `2px solid ${priorityColor}`,
          borderRadius: 14,
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          {!isNew && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--text-dim)',
              flexShrink: 0,
            }}>
              #{String(ticket.id).padStart(3, '0')}
            </span>
          )}
          <h2 style={{
            margin: 0, flex: 1,
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.2px',
          }}>
            {isNew ? (parentId ? `New Sub-ticket of #${parentId}` : 'New Ticket') : 'Edit Ticket'}
          </h2>
          {!isNew && (
            <button
              onClick={handleAddChild}
              title="Create sub-ticket"
              style={{
                background: 'var(--accent-dim)',
                border: '1px solid rgba(245, 166, 35, 0.2)',
                borderRadius: 6,
                color: 'var(--accent)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                padding: '4px 10px',
                cursor: 'pointer',
                letterSpacing: '0.05em',
                transition: 'background 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(245,166,35,0.15)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--accent-dim)'}
            >
              + sub-ticket
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
              transition: 'color 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ×
          </button>
        </div>

        {/* Form body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 6,
              color: 'var(--p-critical)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Title">
              <input
                ref={titleRef}
                value={form.title}
                onChange={set('title')}
                required
                placeholder="What needs to be done?"
                style={{ ...fieldStyle }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                placeholder="Add details…"
                style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.5 }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Status">
                <select value={form.status} onChange={set('status')} style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={set('priority')} style={{ ...fieldStyle, color: priorityColor }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Assignee">
                <input value={form.assignee} onChange={set('assignee')} placeholder="e.g. alice"
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </Field>
              <Field label="Team Tag">
                <input value={form.team_tag} onChange={set('team_tag')} placeholder="e.g. backend"
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </Field>
            </div>

            <Field label="Parent Ticket ID">
              <input
                value={form.parent_id}
                onChange={set('parent_id')}
                type="number"
                min="1"
                placeholder="Leave blank for root ticket"
                style={fieldStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </Field>

            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#09090c',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '9px 0',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  fontFamily: 'var(--font-sans)',
                  transition: 'opacity 0.15s',
                }}
              >
                {saving ? 'Saving…' : isNew ? 'Create Ticket' : 'Save Changes'}
              </button>
              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 8,
                    color: 'var(--p-critical)',
                    fontSize: 13,
                    padding: '9px 16px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(248,113,113,0.15)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
                >
                  Delete
                </button>
              )}
            </div>
          </form>

          {/* Sub-tickets */}
          {!isNew && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ ...labelStyle, marginBottom: 0 }}>
                  Sub-tickets {detail?.children?.length ? `(${detail.children.length})` : ''}
                </span>
                <button
                  onClick={handleAddChild}
                  style={{
                    background: 'transparent',
                    border: '1px dashed var(--border-2)',
                    borderRadius: 6,
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
                >
                  + add
                </button>
              </div>

              {detail?.children?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {detail.children.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleChildClick(c)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${PRIORITY_COLOR[c.priority] || 'var(--border)'}`,
                        borderRadius: 7,
                        padding: '8px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', flexShrink: 0 }}>
                        #{String(c.id).padStart(3, '0')}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                        {c.status}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>→</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '14px 0',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  border: '1px dashed var(--border)',
                  borderRadius: 8,
                }}>
                  no sub-tickets
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          {!isNew && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <span style={{ ...labelStyle, marginBottom: 12, display: 'block' }}>
                Comments {detail?.comments?.length ? `(${detail.comments.length})` : ''}
              </span>

              {detail?.comments?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {detail.comments.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '10px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--accent)',
                        }}>
                          {c.author}
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                          {new Date(c.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                        {c.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleComment} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={commentForm.author}
                  onChange={(e) => setCommentForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder="Your name"
                  required
                  style={fieldStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <textarea
                  value={commentForm.body}
                  onChange={(e) => setCommentForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Add a comment…"
                  required
                  rows={2}
                  style={{ ...fieldStyle, resize: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="submit"
                  style={{
                    alignSelf: 'flex-start',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border-2)',
                    borderRadius: 7,
                    color: 'var(--text)',
                    fontSize: 12,
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    padding: '6px 14px',
                    cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)'; }}
                >
                  Post Comment
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
