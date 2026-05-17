import { describe, it, expect } from 'vitest';
import { reorder } from '../lib/reorder';

// Helpers
function ticket(id, status, position) {
  return { id, title: `T${id}`, status, position, priority: 'medium' };
}

const src = (col, idx) => ({ droppableId: col, index: idx });
const dst = (col, idx) => ({ droppableId: col, index: idx });

describe('reorder — within the same column', () => {
  it('moves card from index 0 to index 2, re-indexes all three', () => {
    const tickets = [
      ticket(1, 'todo', 0),
      ticket(2, 'todo', 1),
      ticket(3, 'todo', 2),
    ];
    const result = reorder(tickets, 1, src('todo', 0), dst('todo', 2));
    const col = result.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position);

    expect(col.map(t => t.id)).toEqual([2, 3, 1]);
    expect(col.map(t => t.position)).toEqual([0, 1, 2]);
  });

  it('moves card from index 2 to index 0, re-indexes all three', () => {
    const tickets = [
      ticket(1, 'todo', 0),
      ticket(2, 'todo', 1),
      ticket(3, 'todo', 2),
    ];
    const result = reorder(tickets, 3, src('todo', 2), dst('todo', 0));
    const col = result.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position);

    expect(col.map(t => t.id)).toEqual([3, 1, 2]);
    expect(col.map(t => t.position)).toEqual([0, 1, 2]);
  });

  it('no duplicate positions after reorder', () => {
    const tickets = [ticket(1, 'todo', 0), ticket(2, 'todo', 1), ticket(3, 'todo', 2)];
    const result = reorder(tickets, 2, src('todo', 1), dst('todo', 0));
    const positions = result.filter(t => t.status === 'todo').map(t => t.position);
    const unique = new Set(positions);
    expect(unique.size).toBe(positions.length);
  });
});

describe('reorder — across columns', () => {
  it('moves card to empty column, sets position 0', () => {
    const tickets = [ticket(1, 'todo', 0)];
    const result = reorder(tickets, 1, src('todo', 0), dst('done', 0));

    const moved = result.find(t => t.id === 1);
    expect(moved.status).toBe('done');
    expect(moved.position).toBe(0);
  });

  it('moves card between populated columns, re-indexes both', () => {
    const tickets = [
      ticket(1, 'todo', 0),
      ticket(2, 'todo', 1),
      ticket(3, 'done', 0),
      ticket(4, 'done', 1),
    ];
    const result = reorder(tickets, 2, src('todo', 1), dst('done', 1));

    const todo = result.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position);
    const done = result.filter(t => t.status === 'done').sort((a, b) => a.position - b.position);

    expect(todo.map(t => t.id)).toEqual([1]);
    expect(todo.map(t => t.position)).toEqual([0]);

    expect(done.map(t => t.id)).toEqual([3, 2, 4]);
    expect(done.map(t => t.position)).toEqual([0, 1, 2]);
  });

  it('cards outside source and dest columns are untouched', () => {
    const tickets = [
      ticket(1, 'todo', 0),
      ticket(2, 'backlog', 0),
      ticket(3, 'review', 0),
    ];
    const result = reorder(tickets, 1, src('todo', 0), dst('done', 0));

    expect(result.find(t => t.id === 2)).toEqual(ticket(2, 'backlog', 0));
    expect(result.find(t => t.id === 3)).toEqual(ticket(3, 'review', 0));
  });

  it('moved card gets correct status', () => {
    const tickets = [ticket(1, 'todo', 0)];
    const result = reorder(tickets, 1, src('todo', 0), dst('in_progress', 0));
    expect(result.find(t => t.id === 1).status).toBe('in_progress');
  });
});

describe('reorder — preserves other card data', () => {
  it('does not strip title, priority, assignee from reordered cards', () => {
    const tickets = [
      { id: 1, title: 'Fix auth', status: 'todo', position: 0, priority: 'high', assignee: 'alice' },
      { id: 2, title: 'Write docs', status: 'todo', position: 1, priority: 'low', assignee: 'bob' },
    ];
    const result = reorder(tickets, 1, src('todo', 0), dst('done', 0));
    const moved = result.find(t => t.id === 1);
    expect(moved.title).toBe('Fix auth');
    expect(moved.priority).toBe('high');
    expect(moved.assignee).toBe('alice');
  });
});
