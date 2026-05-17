import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import TicketCard from './TicketCard';
import { moveTicket } from '../api';

const COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' }
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

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus, position: newPosition } : t
      )
    );

    try {
      await moveTicket(ticketId, newStatus, newPosition);
    } catch {
      // Revert on error
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId ? { ...t, status: source.droppableId, position: source.index } : t
        )
      );
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTickets = byStatus(col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                  {col.label}
                </h3>
                <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                  {colTickets.length}
                </span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-24 rounded-lg p-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-blue-200 border-dashed' : 'bg-gray-100'
                    }`}
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
