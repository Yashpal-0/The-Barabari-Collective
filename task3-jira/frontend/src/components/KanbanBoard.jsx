import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TicketCard from './TicketCard';
import { moveTicket } from '../api';

const COLUMNS = [
  { id: 'backlog',     label: 'Backlog',      color: '#44445a' },
  { id: 'todo',        label: 'Todo',         color: '#7070a0' },
  { id: 'in_progress', label: 'In Progress',  color: '#f5a623' },
  { id: 'review',      label: 'Review',       color: '#a78bfa' },
  { id: 'done',        label: 'Done',         color: '#4ade80' },
];

export default function KanbanBoard({ tickets, setTickets, onTicketClick }) {
  const byStatus = (status) =>
    tickets.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

  async function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const ticketId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    const newPosition = destination.index;
    const oldStatus = source.droppableId;
    const oldPosition = source.index;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus, position: newPosition } : t
      )
    );

    try {
      await moveTicket(ticketId, newStatus, newPosition);
    } catch {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status: oldStatus, position: oldPosition } : t
        )
      );
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {COLUMNS.map((col, colIdx) => {
          const colTickets = byStatus(col.id);
          return (
            <div
              key={col.id}
              style={{
                flexShrink: 0,
                width: 260,
                animationDelay: `${colIdx * 40}ms`,
              }}
              className="animate-fade-in"
            >
              {/* Column header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                padding: '8px 10px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderTop: `2px solid ${col.color}`,
                borderRadius: '0 0 6px 6px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  color: col.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  flex: 1,
                }}>
                  {col.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  background: 'var(--surface-2)',
                  padding: '1px 6px',
                  borderRadius: 4,
                  minWidth: 20,
                  textAlign: 'center',
                }}>
                  {colTickets.length}
                </span>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 80,
                      padding: 8,
                      borderRadius: 10,
                      background: snapshot.isDraggingOver
                        ? `${col.color}0d`
                        : 'var(--surface)',
                      border: snapshot.isDraggingOver
                        ? `1px dashed ${col.color}44`
                        : '1px solid var(--border)',
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                  >
                    {colTickets.map((ticket, index) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        index={index}
                        onClick={onTicketClick}
                      />
                    ))}
                    {provided.placeholder}

                    {colTickets.length === 0 && !snapshot.isDraggingOver && (
                      <div style={{
                        textAlign: 'center',
                        padding: '20px 0',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'var(--text-dim)',
                      }}>
                        empty
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
