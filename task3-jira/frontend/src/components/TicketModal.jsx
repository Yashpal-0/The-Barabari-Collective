import { useState, useEffect } from 'react';
import { getTicket, createTicket, updateTicket, deleteTicket, addComment } from '../api';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const BLANK = { title: '', description: '', status: 'backlog', priority: 'medium', assignee: '', team_tag: '', parent_id: '' };

export default function TicketModal({ ticket, onClose, onSaved, onDeleted }) {
  const isNew = !ticket;
  const [form, setForm] = useState(isNew ? BLANK : {
    title: ticket.title,
    description: ticket.description || '',
    status: ticket.status,
    priority: ticket.priority,
    assignee: ticket.assignee || '',
    team_tag: ticket.team_tag || '',
    parent_id: ticket.parent_id || ''
  });
  const [detail, setDetail] = useState(null);
  const [commentForm, setCommentForm] = useState({ author: '', body: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      getTicket(ticket.id).then(setDetail).catch(() => {});
    }
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
    if (!confirm('Delete this ticket?')) return;
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{isNew ? 'New Ticket' : 'Edit Ticket'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          {error && <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                value={form.title}
                onChange={set('title')}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={set('status')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority} onChange={set('priority')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <input value={form.assignee} onChange={set('assignee')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Tag</label>
                <input value={form.team_tag} onChange={set('team_tag')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Ticket ID</label>
              <input value={form.parent_id} onChange={set('parent_id')} type="number" min="1" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : isNew ? 'Create' : 'Save Changes'}
              </button>
              {!isNew && (
                <button type="button" onClick={handleDelete} className="px-4 bg-red-50 text-red-600 border border-red-200 py-2 rounded-md text-sm font-medium hover:bg-red-100">
                  Delete
                </button>
              )}
            </div>
          </form>

          {/* Children */}
          {!isNew && detail?.children?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Sub-tickets</h3>
              <ul className="space-y-1">
                {detail.children.map((c) => (
                  <li key={c.id} className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded flex justify-between">
                    <span>#{c.id} {c.title}</span>
                    <span className="text-xs text-gray-400">{c.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Comments */}
          {!isNew && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Comments</h3>
              {detail?.comments?.length > 0 ? (
                <ul className="space-y-3 mb-4">
                  {detail.comments.map((c) => (
                    <li key={c.id} className="bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs font-medium text-gray-500 mb-1">{c.author}</p>
                      <p className="text-sm text-gray-800">{c.body}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 mb-4">No comments yet.</p>
              )}
              <form onSubmit={handleComment} className="space-y-2">
                <input
                  value={commentForm.author}
                  onChange={(e) => setCommentForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder="Your name"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  value={commentForm.body}
                  onChange={(e) => setCommentForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Add a comment…"
                  required
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="text-sm bg-gray-800 text-white px-4 py-1.5 rounded-md hover:bg-gray-700">
                  Add Comment
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
