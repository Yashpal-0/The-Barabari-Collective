import { Draggable } from '@hello-pangea/dnd';

const PRIORITY_COLOR = {
  low:      'var(--p-low)',
  medium:   'var(--p-medium)',
  high:     'var(--p-high)',
  critical: 'var(--p-critical)',
};

const PRIORITY_BG = {
  low:      'rgba(74, 222, 128, 0.08)',
  medium:   'rgba(250, 204, 21, 0.08)',
  high:     'rgba(251, 146, 60, 0.08)',
  critical: 'rgba(248, 113, 113, 0.08)',
};

export default function TicketCard({ ticket, index, onClick }) {
  const priorityColor = PRIORITY_COLOR[ticket.priority] || 'var(--border)';

  return (
    <Draggable draggableId={String(ticket.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(ticket)}
          className="animate-fade-in"
          style={{
            ...provided.draggableProps.style,
            marginBottom: 6,
            background: snapshot.isDragging ? 'var(--surface-3)' : 'var(--surface-2)',
            border: `1px solid ${snapshot.isDragging ? 'var(--border-2)' : 'var(--border)'}`,
            borderLeft: `3px solid ${priorityColor}`,
            borderRadius: 8,
            padding: '10px 12px',
            cursor: 'pointer',
            transition: snapshot.isDragging ? 'none' : 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
            boxShadow: snapshot.isDragging
              ? `0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px ${priorityColor}22`
              : 'none',
            transform: snapshot.isDragging
              ? `${provided.draggableProps.style?.transform || ''} rotate(1.5deg)`
              : provided.draggableProps.style?.transform,
          }}
          onMouseOver={e => {
            if (!snapshot.isDragging) {
              e.currentTarget.style.background = 'var(--surface-3)';
              e.currentTarget.style.borderColor = 'var(--border-2)';
            }
          }}
          onMouseOut={e => {
            if (!snapshot.isDragging) {
              e.currentTarget.style.background = 'var(--surface-2)';
              e.currentTarget.style.borderColor = 'var(--border)';
            }
          }}
        >
          {/* Ticket ID + priority badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-dim)',
              letterSpacing: '0.05em',
            }}>
              #{String(ticket.id).padStart(3, '0')}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              color: priorityColor,
              background: PRIORITY_BG[ticket.priority] || 'transparent',
              padding: '2px 6px',
              borderRadius: 4,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              {ticket.priority}
            </span>
          </div>

          {/* Title */}
          <p style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
            lineHeight: 1.4,
            letterSpacing: '-0.1px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {ticket.title}
          </p>

          {/* Meta row */}
          {(ticket.assignee || ticket.team_tag || ticket.parent_id) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
              {ticket.parent_id && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--accent)',
                  background: 'var(--accent-dim)',
                  padding: '2px 5px',
                  borderRadius: 3,
                }}>
                  ↳ #{ticket.parent_id}
                </span>
              )}
              {ticket.team_tag && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '2px 5px',
                  borderRadius: 3,
                }}>
                  {ticket.team_tag}
                </span>
              )}
              {ticket.assignee && (
                <span style={{
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  marginLeft: 'auto',
                }}>
                  {ticket.assignee}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
