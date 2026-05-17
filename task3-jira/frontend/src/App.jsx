import { useState, useEffect, useCallback } from 'react';
import { getTickets } from './api';
import KanbanBoard from './components/KanbanBoard';
import FilterBar from './components/FilterBar';
import TicketModal from './components/TicketModal';

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({});
  const [modal, setModal] = useState(null); // null=closed, { ticket, parentId? }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTickets = useCallback(async () => {
    try {
      setError('');
      const data = await getTickets(filters);
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  function openNew() { setModal({ ticket: null }); }
  function openEdit(ticket) { setModal({ ticket }); }
  function openChild(parentId) { setModal({ ticket: null, parentId }); }

  function handleSaved(ticket, isNew) {
    if (isNew) {
      setTickets((prev) => [...prev, ticket]);
    } else {
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
    }
  }

  function handleDeleted(id) {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28,
            background: 'var(--accent)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="#09090c"/>
              <rect x="8" y="1" width="5" height="5" rx="1" fill="#09090c"/>
              <rect x="1" y="8" width="5" height="5" rx="1" fill="#09090c"/>
              <rect x="8" y="8" width="5" height="2" rx="1" fill="#09090c"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--text)' }}>
            Forge
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          background: 'var(--surface-2)',
          padding: '3px 8px',
          borderRadius: 4,
          border: '1px solid var(--border)',
        }}>
          {tickets.length} tickets
        </span>
      </header>

      <main style={{ padding: '24px' }}>
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onCreateClick={openNew}
          ticketCount={tickets.length}
        />

        {error && (
          <div style={{
            marginBottom: 16,
            padding: '10px 14px',
            background: 'rgba(248, 113, 113, 0.08)',
            border: '1px solid rgba(248, 113, 113, 0.25)',
            borderRadius: 8,
            color: 'var(--p-critical)',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            loading forge...
          </div>
        ) : (
          <KanbanBoard
            tickets={tickets}
            setTickets={setTickets}
            onTicketClick={openEdit}
          />
        )}
      </main>

      {modal && (
        <TicketModal
          ticket={modal.ticket}
          parentId={modal.parentId}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCreateChild={openChild}
          onTicketClick={openEdit}
        />
      )}
    </div>
  );
}
