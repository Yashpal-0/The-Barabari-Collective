import { Draggable } from '@hello-pangea/dnd';

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function TicketCard({ ticket, index, onClick }) {
  return (
    <Draggable draggableId={String(ticket.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(ticket)}
          className={`bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${
            snapshot.isDragging ? 'shadow-lg rotate-1' : ''
          }`}
        >
          <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{ticket.title}</p>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[ticket.priority] || 'bg-gray-100 text-gray-600'}`}>
              {ticket.priority}
            </span>
            {ticket.assignee && (
              <span className="text-xs text-gray-500 truncate">{ticket.assignee}</span>
            )}
          </div>
          {ticket.team_tag && (
            <span className="mt-1 inline-block text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              {ticket.team_tag}
            </span>
          )}
        </div>
      )}
    </Draggable>
  );
}
