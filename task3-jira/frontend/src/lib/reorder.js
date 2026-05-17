/**
 * Pure function: reorder tickets after a drag-drop.
 *
 * Rebuilds positions for all cards in the affected column(s) so
 * no two cards share the same position after the move.
 *
 * @param {Array}  tickets  - full flat ticket list
 * @param {number} ticketId - id of the dragged card
 * @param {object} source   - { droppableId, index }
 * @param {object} dest     - { droppableId, index }
 * @returns {Array} new ticket list (original objects mutated only via spread)
 */
export function reorder(tickets, ticketId, source, dest) {
  const isSameCol = source.droppableId === dest.droppableId;

  const sorted = (col) =>
    tickets.filter((t) => t.status === col).sort((a, b) => a.position - b.position);

  const sourceItems = sorted(source.droppableId);
  const destItems   = isSameCol ? sourceItems : sorted(dest.droppableId);

  // Remove dragged card from source array
  const moved     = sourceItems.find((t) => t.id === ticketId);
  const newSource = sourceItems.filter((t) => t.id !== ticketId);

  // Insert into destination array
  const newDest = isSameCol ? [...newSource] : [...destItems];
  newDest.splice(dest.index, 0, { ...moved, status: dest.droppableId });

  // Re-index positions in affected column(s)
  const updates = new Map();
  if (isSameCol) {
    newDest.forEach((t, i) => updates.set(t.id, { ...t, position: i }));
  } else {
    newSource.forEach((t, i) => updates.set(t.id, { ...t, position: i }));
    newDest.forEach((t, i) => updates.set(t.id, { ...t, position: i }));
  }

  return tickets.map((t) => updates.get(t.id) ?? t);
}
