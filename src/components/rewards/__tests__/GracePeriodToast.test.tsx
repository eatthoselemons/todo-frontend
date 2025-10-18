/** @jsxImportSource @emotion/react */
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GracePeriodToast } from '../../../features/rewards/components/GracePeriodToast';
import { Task, BaseState } from '../../../features/tasks/domain/Task';

// Mock task helper
const createMockTask = (id: string, text: string): Task => ({
  id,
  text,
  internalState: BaseState.IN_PROGRESS,
  nextState: jest.fn(),
} as any);

describe('GracePeriodToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render toast when toasts are provided', () => {
    const task = createMockTask('task-1', 'Test task');
    const toasts = [
      { id: 'toast-1', task, message: '"Test task" moving to Done' },
    ];

    render(
      <GracePeriodToast
        toasts={toasts}
        onUndo={jest.fn()}
        onExpire={jest.fn()}
      />
    );

    expect(screen.getByText('"Test task" moving to Done')).toBeInTheDocument();
    expect(screen.getByText('Undo')).toBeInTheDocument();
  });

  it('should not render when no toasts', () => {
    const { container } = render(
      <GracePeriodToast
        toasts={[]}
        onUndo={jest.fn()}
        onExpire={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should call onUndo when undo button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    const task = createMockTask('task-1', 'Test task');
    const onUndo = jest.fn();
    const toasts = [
      { id: 'toast-1', task, message: '"Test task" moving to Done' },
    ];

    render(
      <GracePeriodToast
        toasts={toasts}
        onUndo={onUndo}
        onExpire={jest.fn()}
      />
    );

    const undoButton = screen.getByText('Undo');
    await user.click(undoButton);

    // Wait for exit animation (300ms)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(onUndo).toHaveBeenCalledWith('task-1');
  });

  it('should call onExpire when grace period expires', async () => {
    const task = createMockTask('task-1', 'Test task');
    const onExpire = jest.fn();
    const toasts = [
      { id: 'toast-1', task, message: '"Test task" moving to Done' },
    ];

    render(
      <GracePeriodToast
        toasts={toasts}
        onUndo={jest.fn()}
        onExpire={onExpire}
      />
    );

    // Advance past grace period (5000ms) + exit animation (300ms)
    act(() => {
      jest.advanceTimersByTime(5300);
    });

    // Wait for async operations
    await waitFor(() => {
      expect(onExpire).toHaveBeenCalledWith('task-1');
    });
  });

  it('should handle multiple toasts correctly', () => {
    const task1 = createMockTask('task-1', 'Task 1');
    const task2 = createMockTask('task-2', 'Task 2');
    const toasts = [
      { id: 'toast-1', task: task1, message: '"Task 1" moving to Done' },
      { id: 'toast-2', task: task2, message: '"Task 2" moving to Done' },
    ];

    render(
      <GracePeriodToast
        toasts={toasts}
        onUndo={jest.fn()}
        onExpire={jest.fn()}
      />
    );

    expect(screen.getByText('"Task 1" moving to Done')).toBeInTheDocument();
    expect(screen.getByText('"Task 2" moving to Done')).toBeInTheDocument();
    expect(screen.getAllByText('Undo')).toHaveLength(2);
  });

  it('should use functional state update when adding new toasts', () => {
    const task1 = createMockTask('task-1', 'Task 1');
    const task2 = createMockTask('task-2', 'Task 2');
    const onExpire = jest.fn();

    const { rerender } = render(
      <GracePeriodToast
        toasts={[{ id: 'toast-1', task: task1, message: '"Task 1" moving to Done' }]}
        onUndo={jest.fn()}
        onExpire={onExpire}
      />
    );

    expect(screen.getByText('"Task 1" moving to Done')).toBeInTheDocument();

    // Add second toast
    rerender(
      <GracePeriodToast
        toasts={[
          { id: 'toast-1', task: task1, message: '"Task 1" moving to Done' },
          { id: 'toast-2', task: task2, message: '"Task 2" moving to Done' },
        ]}
        onUndo={jest.fn()}
        onExpire={onExpire}
      />
    );

    // Both toasts should be visible
    expect(screen.getByText('"Task 1" moving to Done')).toBeInTheDocument();
    expect(screen.getByText('"Task 2" moving to Done')).toBeInTheDocument();
  });

  it('should preserve timer state when toast list updates', async () => {
    const task1 = createMockTask('task-1', 'Task 1');
    const task2 = createMockTask('task-2', 'Task 2');
    const onExpire = jest.fn();

    const { rerender } = render(
      <GracePeriodToast
        toasts={[{ id: 'toast-1', task: task1, message: '"Task 1" moving to Done' }]}
        onUndo={jest.fn()}
        onExpire={onExpire}
      />
    );

    // Advance time partially
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Add second toast - should not reset first toast's timer
    rerender(
      <GracePeriodToast
        toasts={[
          { id: 'toast-1', task: task1, message: '"Task 1" moving to Done' },
          { id: 'toast-2', task: task2, message: '"Task 2" moving to Done' },
        ]}
        onUndo={jest.fn()}
        onExpire={onExpire}
      />
    );

    // Advance remaining time for first toast (3000ms + 100ms buffer for interval) + animation (300ms)
    act(() => {
      jest.advanceTimersByTime(3400);
    });

    // Wait for async operations
    await waitFor(() => {
      expect(onExpire).toHaveBeenCalledWith('task-1');
    });

    // Second toast should still be visible (only 3400ms elapsed for it)
    expect(screen.getByText('"Task 2" moving to Done')).toBeInTheDocument();
  });

  it('should update countdown timer correctly', () => {
    const task = createMockTask('task-1', 'Test task');
    const toasts = [
      { id: 'toast-1', task, message: '"Test task" moving to Done' },
    ];

    render(
      <GracePeriodToast
        toasts={toasts}
        onUndo={jest.fn()}
        onExpire={jest.fn()}
      />
    );

    // Initial countdown should be close to 5.0s
    expect(screen.getByText(/5\.0s remaining/)).toBeInTheDocument();

    // Advance by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should show ~4.0s remaining
    expect(screen.getByText(/4\.0s remaining/)).toBeInTheDocument();

    // Advance by another 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Should show ~2.0s remaining
    expect(screen.getByText(/2\.0s remaining/)).toBeInTheDocument();
  });

  it('should handle rapid toast additions without losing state', () => {
    const task1 = createMockTask('task-1', 'Task 1');
    const task2 = createMockTask('task-2', 'Task 2');
    const task3 = createMockTask('task-3', 'Task 3');
    const onExpire = jest.fn();

    const { rerender } = render(
      <GracePeriodToast
        toasts={[{ id: 'toast-1', task: task1, message: 'Task 1' }]}
        onUndo={jest.fn()}
        onExpire={onExpire}
      />
    );

    // Rapidly add toasts
    rerender(
      <GracePeriodToast
        toasts={[
          { id: 'toast-1', task: task1, message: 'Task 1' },
          { id: 'toast-2', task: task2, message: 'Task 2' },
        ]}
        onUndo={jest.fn()}
        onExpire={onExpire}
      />
    );

    rerender(
      <GracePeriodToast
        toasts={[
          { id: 'toast-1', task: task1, message: 'Task 1' },
          { id: 'toast-2', task: task2, message: 'Task 2' },
          { id: 'toast-3', task: task3, message: 'Task 3' },
        ]}
        onUndo={jest.fn()}
        onExpire={onExpire}
      />
    );

    // All toasts should be visible
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  it('should handle toast removal from props', () => {
    const task1 = createMockTask('task-1', 'Task 1');
    const task2 = createMockTask('task-2', 'Task 2');

    const { rerender } = render(
      <GracePeriodToast
        toasts={[
          { id: 'toast-1', task: task1, message: 'Task 1' },
          { id: 'toast-2', task: task2, message: 'Task 2' },
        ]}
        onUndo={jest.fn()}
        onExpire={jest.fn()}
      />
    );

    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();

    // Remove first toast from props
    rerender(
      <GracePeriodToast
        toasts={[{ id: 'toast-2', task: task2, message: 'Task 2' }]}
        onUndo={jest.fn()}
        onExpire={jest.fn()}
      />
    );

    // Only second toast should remain
    expect(screen.queryByText('Task 1')).not.toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });
});
