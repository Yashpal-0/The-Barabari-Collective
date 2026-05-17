const selectStyle = {
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
  padding: '6px 10px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%237070a0' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: 28,
  transition: 'border-color 0.15s',
};

const inputStyle = {
  ...selectStyle,
  backgroundImage: 'none',
  paddingRight: 10,
};

export default function FilterBar({ filters, onChange, onCreateClick }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
      padding: '12px 16px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
    }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginRight: 4,
      }}>
        FILTER
      </span>

      <select value={filters.status || ''} onChange={set('status')} style={selectStyle}>
        <option value="">Status</option>
        <option value="backlog">Backlog</option>
        <option value="todo">Todo</option>
        <option value="in_progress">In Progress</option>
        <option value="review">Review</option>
        <option value="done">Done</option>
      </select>

      <select value={filters.priority || ''} onChange={set('priority')} style={selectStyle}>
        <option value="">Priority</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      <input
        type="text"
        placeholder="Team…"
        value={filters.team || ''}
        onChange={set('team')}
        style={{ ...inputStyle, width: 110 }}
      />

      <input
        type="text"
        placeholder="Assignee…"
        value={filters.assignee || ''}
        onChange={set('assignee')}
        style={{ ...inputStyle, width: 120 }}
      />

      {activeFilters > 0 && (
        <button
          onClick={() => onChange({})}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            fontSize: 12,
            padding: '5px 10px',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseOver={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
          onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          Clear {activeFilters > 1 ? `(${activeFilters})` : ''}
        </button>
      )}

      <div style={{ flex: 1 }} />

      <button
        onClick={onCreateClick}
        style={{
          background: 'var(--accent)',
          border: 'none',
          borderRadius: 8,
          color: '#09090c',
          fontSize: 13,
          fontWeight: 700,
          padding: '7px 14px',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          letterSpacing: '-0.2px',
          transition: 'opacity 0.15s, transform 0.1s',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
        onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
        onMouseOut={e => e.currentTarget.style.opacity = '1'}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span>
        New Ticket
      </button>
    </div>
  );
}
