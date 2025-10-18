import { renderHook } from '@testing-library/react';
import { useTaskWatcher } from '../useTaskWatcher';
import { Task } from '../../features/tasks/domain/Task';
import useTaskHooks from '../useTaskHooks';

// Mock useTaskHooks
jest.mock('../useTaskHooks');

describe('useTaskWatcher', () => {
  let mockWatchTaskForChanges: jest.Mock;
  let mockCancel: jest.Mock;

  beforeEach(() => {
    mockCancel = jest.fn();
    mockWatchTaskForChanges = jest.fn().mockReturnValue(mockCancel);

    (useTaskHooks as jest.Mock).mockReturnValue({
      watchTaskForChanges: mockWatchTaskForChanges,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should subscribe to task changes on mount', () => {
    const onChange = jest.fn();
    const taskId = 'task-1';

    renderHook(() => useTaskWatcher(taskId, onChange));

    expect(mockWatchTaskForChanges).toHaveBeenCalledTimes(1);
    expect(mockWatchTaskForChanges).toHaveBeenCalledWith(taskId, expect.any(Function));
  });

  it('should unsubscribe on unmount', () => {
    const onChange = jest.fn();
    const taskId = 'task-1';

    const { unmount } = renderHook(() => useTaskWatcher(taskId, onChange));

    unmount();

    expect(mockCancel).toHaveBeenCalledTimes(1);
  });

  it('should call onChange when task changes', () => {
    const onChange = jest.fn();
    const taskId = 'task-1';
    const mockTask = { id: taskId, text: 'Test task' } as Task;

    renderHook(() => useTaskWatcher(taskId, onChange));

    // Get the callback passed to watchTaskForChanges
    const watchCallback = mockWatchTaskForChanges.mock.calls[0][1];

    // Simulate a task change
    watchCallback(mockTask);

    expect(onChange).toHaveBeenCalledWith(mockTask);
  });

  it('should not re-subscribe when onChange reference changes', () => {
    const taskId = 'task-1';
    let onChange1 = jest.fn();
    let onChange2 = jest.fn();

    const { rerender } = renderHook(
      ({ taskId, onChange }) => useTaskWatcher(taskId, onChange),
      { initialProps: { taskId, onChange: onChange1 } }
    );

    expect(mockWatchTaskForChanges).toHaveBeenCalledTimes(1);
    const firstCallbackRef = mockWatchTaskForChanges.mock.calls[0][1];

    // Change onChange function (simulate parent re-render with new function reference)
    rerender({ taskId, onChange: onChange2 });

    // Should NOT re-subscribe (still only 1 call to watchTaskForChanges)
    expect(mockWatchTaskForChanges).toHaveBeenCalledTimes(1);
    expect(mockCancel).not.toHaveBeenCalled();

    // Verify the callback reference is stable
    expect(mockWatchTaskForChanges.mock.calls[0][1]).toBe(firstCallbackRef);
  });

  it('should use latest onChange callback even if reference changes', () => {
    const taskId = 'task-1';
    const mockTask = { id: taskId, text: 'Test task' } as Task;
    let onChange1 = jest.fn();
    let onChange2 = jest.fn();

    const { rerender } = renderHook(
      ({ taskId, onChange }) => useTaskWatcher(taskId, onChange),
      { initialProps: { taskId, onChange: onChange1 } }
    );

    // Get the stable callback passed to watchTaskForChanges
    const stableCallback = mockWatchTaskForChanges.mock.calls[0][1];

    // Change onChange function
    rerender({ taskId, onChange: onChange2 });

    // Trigger the stable callback
    stableCallback(mockTask);

    // Should call the NEW onChange (onChange2), not the old one
    expect(onChange1).not.toHaveBeenCalled();
    expect(onChange2).toHaveBeenCalledWith(mockTask);
  });

  it('should re-subscribe when taskId changes', () => {
    const onChange = jest.fn();
    const taskId1 = 'task-1';
    const taskId2 = 'task-2';

    const { rerender } = renderHook(
      ({ taskId, onChange }) => useTaskWatcher(taskId, onChange),
      { initialProps: { taskId: taskId1, onChange } }
    );

    expect(mockWatchTaskForChanges).toHaveBeenCalledTimes(1);
    expect(mockWatchTaskForChanges).toHaveBeenCalledWith(taskId1, expect.any(Function));

    // Change taskId
    rerender({ taskId: taskId2, onChange });

    // Should cancel old subscription and create new one
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockWatchTaskForChanges).toHaveBeenCalledTimes(2);
    expect(mockWatchTaskForChanges).toHaveBeenLastCalledWith(taskId2, expect.any(Function));
  });

  it('should handle multiple rapid onChange updates correctly', () => {
    const taskId = 'task-1';
    const mockTask = { id: taskId, text: 'Test task' } as Task;
    const onChange1 = jest.fn();
    const onChange2 = jest.fn();
    const onChange3 = jest.fn();

    const { rerender } = renderHook(
      ({ taskId, onChange }) => useTaskWatcher(taskId, onChange),
      { initialProps: { taskId, onChange: onChange1 } }
    );

    const stableCallback = mockWatchTaskForChanges.mock.calls[0][1];

    // Rapidly change onChange multiple times
    rerender({ taskId, onChange: onChange2 });
    rerender({ taskId, onChange: onChange3 });

    // Trigger callback
    stableCallback(mockTask);

    // Should only call the latest onChange
    expect(onChange1).not.toHaveBeenCalled();
    expect(onChange2).not.toHaveBeenCalled();
    expect(onChange3).toHaveBeenCalledWith(mockTask);

    // Should not have re-subscribed
    expect(mockWatchTaskForChanges).toHaveBeenCalledTimes(1);
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('should maintain stable callback reference across renders', () => {
    const taskId = 'task-1';
    const onChange = jest.fn();

    const { rerender } = renderHook(
      ({ taskId, onChange }) => useTaskWatcher(taskId, onChange),
      { initialProps: { taskId, onChange } }
    );

    const firstCallback = mockWatchTaskForChanges.mock.calls[0][1];

    // Multiple re-renders with same props
    rerender({ taskId, onChange });
    rerender({ taskId, onChange });
    rerender({ taskId, onChange });

    // Should still be the same stable callback
    expect(mockWatchTaskForChanges).toHaveBeenCalledTimes(1);
    expect(mockWatchTaskForChanges.mock.calls[0][1]).toBe(firstCallback);
  });
});
