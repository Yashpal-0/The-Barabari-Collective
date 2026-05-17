import { useState, useEffect, useCallback } from 'react';
import { getTickets } from './api';
import KanbanBoard from './components/KanbanBoard';
import FilterBar from './components/FilterBar';
import TicketModal from './components/TicketModal';

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({});
  const [modalTicket, setModalTicket] = useState(undefined); // undefined=closed, null=new, ticket=edit
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
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
      </header>

      <main className="px-6">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          onCreateClick={() => setModalTicket(null)}
        />

        {error && (
          <div className="mb-4 text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-12">Loading…</p>
        ) : (
          <KanbanBoard
            tickets={tickets}
            setTickets={setTickets}
            onTicketClick={(ticket) => setModalTicket(ticket)}
          />
        )}
      </main>

      {modalTicket !== undefined && (
        <TicketModal
          ticket={modalTicket}
          onClose={() => setModalTicket(undefined)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
