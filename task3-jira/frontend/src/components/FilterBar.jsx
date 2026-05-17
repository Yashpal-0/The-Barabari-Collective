export default function FilterBar({ filters, onChange, onCreateClick }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value });

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <select
        value={filters.status || ''}
        onChange={set('status')}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Statuses</option>
        <option value="backlog">Backlog</option>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="review">Review</option>
        <option value="done">Done</option>
      </select>

      <select
        value={filters.priority || ''}
        onChange={set('priority')}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>

      <input
        type="text"
        placeholder="Filter by team..."
        value={filters.team || ''}
        onChange={set('team')}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <input
        type="text"
        placeholder="Filter by assignee..."
        value={filters.assignee || ''}
        onChange={set('assignee')}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={onCreateClick}
        className="ml-auto text-sm bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition-colors font-medium"
      >
        + New Ticket
      </button>
    </div>
  );
}
