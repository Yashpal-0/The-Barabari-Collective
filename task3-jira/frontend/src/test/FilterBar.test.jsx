import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from '../components/FilterBar';

function setup(filters = {}, onChange = vi.fn(), onCreateClick = vi.fn()) {
  render(<FilterBar filters={filters} onChange={onChange} onCreateClick={onCreateClick} />);
  return { onChange, onCreateClick };
}

describe('FilterBar', () => {
  it('renders status, priority, team, assignee controls', () => {
    setup();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Team…')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Assignee…')).toBeInTheDocument();
  });

  it('calls onChange when status changes', () => {
    const onChange = vi.fn();
    setup({}, onChange);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'done' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }));
  });

  it('calls onChange when priority changes', () => {
    const onChange = vi.fn();
    setup({}, onChange);
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'high' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ priority: 'high' }));
  });

  it('calls onChange when team input changes', () => {
    const onChange = vi.fn();
    setup({}, onChange);
    fireEvent.change(screen.getByPlaceholderText('Team…'), { target: { value: 'backend' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ team: 'backend' }));
  });

  it('calls onCreateClick when New Ticket button clicked', () => {
    const onCreateClick = vi.fn();
    setup({}, vi.fn(), onCreateClick);
    fireEvent.click(screen.getByText('New Ticket'));
    expect(onCreateClick).toHaveBeenCalledOnce();
  });

  it('shows Clear button when filters are active', () => {
    setup({ status: 'done' });
    expect(screen.getByText(/Clear/)).toBeInTheDocument();
  });

  it('does not show Clear button when no filters active', () => {
    setup({});
    expect(screen.queryByText(/Clear/)).not.toBeInTheDocument();
  });

  it('Clear button resets all filters', () => {
    const onChange = vi.fn();
    setup({ status: 'done', priority: 'high' }, onChange);
    fireEvent.click(screen.getByText(/Clear/));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('preserves existing filters when changing one filter', () => {
    const onChange = vi.fn();
    setup({ status: 'done', priority: 'high' }, onChange);
    fireEvent.change(screen.getByPlaceholderText('Assignee…'), { target: { value: 'alice' } });
    expect(onChange).toHaveBeenCalledWith({ status: 'done', priority: 'high', assignee: 'alice' });
  });
});
