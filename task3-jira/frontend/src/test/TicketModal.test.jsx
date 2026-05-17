import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TicketModal from '../components/TicketModal';

vi.mock('../api', () => ({
  getTicket: vi.fn(),
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
  deleteTicket: vi.fn(),
  addComment: vi.fn(),
}));

import { getTicket, createTicket, updateTicket, deleteTicket, addComment } from '../api';

const noop = vi.fn();
const baseTicket = {
  id: 1, title: 'Fix login', description: 'Auth broken',
  status: 'todo', priority: 'high', assignee: 'alice', team_tag: 'backend', parent_id: null,
};
const detailResponse = { ticket: baseTicket, children: [], comments: [] };

beforeEach(() => vi.clearAllMocks());

describe('TicketModal — new ticket', () => {
  it('renders create form with empty fields', () => {
    render(<TicketModal ticket={null} onClose={noop} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);
    expect(screen.getByText('New Ticket')).toBeInTheDocument();
    expect(screen.getByText('Create Ticket')).toBeInTheDocument();
  });

  it('prefills parent_id when parentId prop provided', () => {
    render(<TicketModal ticket={null} parentId={5} onClose={noop} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);
    expect(screen.getByText(/New Sub-ticket of #5/)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(5);
  });

  it('calls createTicket and onSaved on valid submit', async () => {
    const created = { id: 2, title: 'New one', status: 'backlog', priority: 'medium' };
    createTicket.mockResolvedValueOnce(created);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    render(<TicketModal ticket={null} onClose={onClose} onSaved={onSaved} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), { target: { value: 'New one' } });
    fireEvent.click(screen.getByText('Create Ticket'));

    await waitFor(() => expect(createTicket).toHaveBeenCalledOnce());
    expect(onSaved).toHaveBeenCalledWith(created, true);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows validation error from API', async () => {
    createTicket.mockRejectedValueOnce(new Error('title required'));
    render(<TicketModal ticket={null} onClose={noop} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);

    fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('Create Ticket'));

    await waitFor(() => expect(screen.getByText('title required')).toBeInTheDocument());
  });
});

describe('TicketModal — edit ticket', () => {
  beforeEach(() => {
    getTicket.mockResolvedValue(detailResponse);
  });

  it('renders edit form with ticket data', async () => {
    render(<TicketModal ticket={baseTicket} onClose={noop} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);
    expect(screen.getByDisplayValue('Fix login')).toBeInTheDocument();
  });

  it('shows + sub-ticket button in header', async () => {
    render(<TicketModal ticket={baseTicket} onClose={noop} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);
    expect(screen.getAllByText(/sub-ticket/).length).toBeGreaterThan(0);
  });

  it('header sub-ticket button calls onCreateChild with ticket id', async () => {
    const onCreateChild = vi.fn();
    const onClose = vi.fn();
    render(<TicketModal ticket={baseTicket} onClose={onClose} onSaved={noop} onDeleted={noop} onCreateChild={onCreateChild} onTicketClick={noop} />);

    fireEvent.click(screen.getByText('+ sub-ticket'));
    expect(onCreateChild).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('section add button also calls onCreateChild', async () => {
    render(<TicketModal ticket={baseTicket} onClose={vi.fn()} onSaved={noop} onDeleted={noop} onCreateChild={vi.fn()} onTicketClick={noop} />);
    const addBtns = screen.getAllByText('+ add');
    expect(addBtns.length).toBeGreaterThan(0);
  });

  it('calls updateTicket on save', async () => {
    const updated = { ...baseTicket, priority: 'critical' };
    updateTicket.mockResolvedValueOnce(updated);
    const onSaved = vi.fn();
    render(<TicketModal ticket={baseTicket} onClose={vi.fn()} onSaved={onSaved} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);

    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(updateTicket).toHaveBeenCalledWith(1, expect.any(Object)));
    expect(onSaved).toHaveBeenCalledWith(updated, false);
  });

  it('calls deleteTicket and onDeleted on delete confirm', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    deleteTicket.mockResolvedValueOnce(null);
    const onDeleted = vi.fn();
    render(<TicketModal ticket={baseTicket} onClose={vi.fn()} onSaved={noop} onDeleted={onDeleted} onCreateChild={noop} onTicketClick={noop} />);

    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => expect(deleteTicket).toHaveBeenCalledWith(1));
    expect(onDeleted).toHaveBeenCalledWith(1);
  });

  it('does not delete if confirm cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    render(<TicketModal ticket={baseTicket} onClose={noop} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(deleteTicket).not.toHaveBeenCalled();
  });
});

describe('TicketModal — children', () => {
  it('renders clickable children when detail has children', async () => {
    const children = [
      { id: 2, title: 'Login API', status: 'todo', priority: 'medium', parent_id: 1 },
    ];
    getTicket.mockResolvedValue({ ticket: baseTicket, children, comments: [] });
    const onTicketClick = vi.fn();
    const onClose = vi.fn();
    render(<TicketModal ticket={baseTicket} onClose={onClose} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={onTicketClick} />);

    await waitFor(() => expect(screen.getByText('Login API')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Login API'));
    expect(onClose).toHaveBeenCalled();
    expect(onTicketClick).toHaveBeenCalledWith(children[0]);
  });
});

describe('TicketModal — comments', () => {
  it('renders existing comments', async () => {
    const comments = [{ id: 1, ticket_id: 1, author: 'Alice', body: 'Looks good', created_at: new Date().toISOString() }];
    getTicket.mockResolvedValue({ ticket: baseTicket, children: [], comments });
    render(<TicketModal ticket={baseTicket} onClose={noop} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);

    await waitFor(() => expect(screen.getByText('Looks good')).toBeInTheDocument());
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('submits new comment', async () => {
    getTicket.mockResolvedValue(detailResponse);
    const newComment = { id: 2, ticket_id: 1, author: 'Bob', body: 'Fixed!', created_at: new Date().toISOString() };
    addComment.mockResolvedValueOnce(newComment);
    render(<TicketModal ticket={baseTicket} onClose={noop} onSaved={noop} onDeleted={noop} onCreateChild={noop} onTicketClick={noop} />);

    await waitFor(() => screen.getByPlaceholderText('Your name'));
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByPlaceholderText('Add a comment…'), { target: { value: 'Fixed!' } });
    fireEvent.click(screen.getByText('Post Comment'));

    await waitFor(() => expect(addComment).toHaveBeenCalledWith(1, { author: 'Bob', body: 'Fixed!' }));
    await waitFor(() => expect(screen.getByText('Fixed!')).toBeInTheDocument());
  });
});
