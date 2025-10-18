import { Task, BaseState, TaskID } from '../../features/tasks/domain/Task';
import {
  exportTaskToYaml,
  importTaskFromYaml,
  YamlTask,
} from '../yamlConverter';

describe('yamlConverter', () => {
  describe('exportTaskToYaml', () => {
    it('should export a simple task to YAML', () => {
      const task = new Task('Test Task', BaseState.NOT_STARTED);
      const childrenMap = new Map<TaskID, Task[]>();

      const yaml = exportTaskToYaml(task, childrenMap);

      expect(yaml).toContain('text: Test Task');
      expect(yaml).not.toContain('state:'); // NOT_STARTED is default, should be omitted
    });

    it('should export task with state and dueDate', () => {
      const task = new Task(
        'Test Task',
        BaseState.IN_PROGRESS,
        undefined,
        [],
        [],
        '2025-12-25'
      );
      const childrenMap = new Map<TaskID, Task[]>();

      const yaml = exportTaskToYaml(task, childrenMap);

      expect(yaml).toContain('text: Test Task');
      expect(yaml).toContain('state: in_progress');
      expect(yaml).toContain('dueDate:');
      expect(yaml).toContain('2025-12-25');
    });

    it('should export task with children', () => {
      const parent = new Task('Parent Task');
      const child1 = new Task('Child 1');
      const child2 = new Task('Child 2', BaseState.DONE);

      const childrenMap = new Map<TaskID, Task[]>([
        [parent.id, [child1, child2]],
      ]);

      const yaml = exportTaskToYaml(parent, childrenMap);

      expect(yaml).toContain('text: Parent Task');
      expect(yaml).toContain('children:');
      expect(yaml).toContain('- text: Child 1');
      expect(yaml).toContain('- text: Child 2');
      expect(yaml).toContain('state: done');
    });

    it('should export nested children', () => {
      const parent = new Task('Parent');
      const child = new Task('Child');
      const grandchild = new Task('Grandchild');

      const childrenMap = new Map<TaskID, Task[]>([
        [parent.id, [child]],
        [child.id, [grandchild]],
      ]);

      const yaml = exportTaskToYaml(parent, childrenMap);

      expect(yaml).toContain('text: Parent');
      expect(yaml).toContain('- text: Child');
      expect(yaml).toContain('- text: Grandchild');
    });
  });

  describe('importTaskFromYaml', () => {
    it('should import simple YAML', () => {
      const yaml = 'text: Updated Task';
      const existingTask = new Task('Original Task');
      const childrenMap = new Map();

      const result = importTaskFromYaml(yaml, existingTask, childrenMap);

      expect(result.updatedTask.text).toBe('Updated Task');
      expect(result.childrenToCreate).toHaveLength(0);
      expect(result.childrenToDelete).toHaveLength(0);
    });

    it('should import task with state and dueDate', () => {
      const yaml = `text: Test Task
state: in_progress
dueDate: '2025-12-25'`;

      const existingTask = new Task('Test Task');
      const childrenMap = new Map();

      const result = importTaskFromYaml(yaml, existingTask, childrenMap);

      expect(result.updatedTask.text).toBe('Test Task');
      expect(result.updatedTask.internalState).toBe(BaseState.IN_PROGRESS);
      expect(result.updatedTask.dueDate).toBe('2025-12-25');
    });

    it('should create new children', () => {
      const yaml = `text: Parent
children:
  - text: New Child 1
  - text: New Child 2
    state: done`;

      const existingTask = new Task('Parent');
      const childrenMap = new Map();

      const result = importTaskFromYaml(yaml, existingTask, childrenMap);

      expect(result.childrenToCreate).toHaveLength(2);
      expect(result.childrenToCreate[0].task.text).toBe('New Child 1');
      expect(result.childrenToCreate[1].task.text).toBe('New Child 2');
      expect(result.childrenToCreate[1].task.internalState).toBe(BaseState.DONE);
    });

    it('should update existing children by matching text', () => {
      const yaml = `text: Parent
children:
  - text: Existing Child
    state: done`;

      const existingTask = new Task('Parent');
      const existingChild = new Task('Existing Child', BaseState.NOT_STARTED);
      const childrenMap = new Map([[existingChild.id, existingChild]]);

      const result = importTaskFromYaml(yaml, existingTask, childrenMap);

      expect(result.childrenToUpdate).toHaveLength(1);
      expect(result.childrenToUpdate[0].id).toBe(existingChild.id);
      expect(result.childrenToUpdate[0].updates.internalState).toBe(BaseState.DONE);
      expect(result.childrenToCreate).toHaveLength(0);
    });

    it('should delete children not in YAML', () => {
      const yaml = `text: Parent
children:
  - text: Keep This`;

      const existingTask = new Task('Parent');
      const keepChild = new Task('Keep This');
      const deleteChild = new Task('Delete This');
      const childrenMap = new Map([
        [keepChild.id, keepChild],
        [deleteChild.id, deleteChild],
      ]);

      const result = importTaskFromYaml(yaml, existingTask, childrenMap);

      expect(result.childrenToDelete).toContain(deleteChild.id);
      expect(result.childrenToDelete).not.toContain(keepChild.id);
    });

    it('should handle nested children creation', () => {
      const yaml = `text: Parent
children:
  - text: Child
    children:
      - text: Grandchild`;

      const existingTask = new Task('Parent');
      const childrenMap = new Map();

      const result = importTaskFromYaml(yaml, existingTask, childrenMap);

      expect(result.childrenToCreate).toHaveLength(1);
      expect(result.childrenToCreate[0].task.text).toBe('Child');
      expect(result.childrenToCreate[0].children).toBeDefined();
      expect(result.childrenToCreate[0].children).toHaveLength(1);
      expect(result.childrenToCreate[0].children![0].task.text).toBe('Grandchild');
    });

    it('should throw error for invalid YAML', () => {
      const invalidYaml = 'invalid: yaml: structure:';
      const existingTask = new Task('Task');
      const childrenMap = new Map();

      expect(() => {
        importTaskFromYaml(invalidYaml, existingTask, childrenMap);
      }).toThrow();
    });

    it('should throw error for missing text field', () => {
      const yaml = 'state: done';
      const existingTask = new Task('Task');
      const childrenMap = new Map();

      expect(() => {
        importTaskFromYaml(yaml, existingTask, childrenMap);
      }).toThrow('text field is required');
    });

    it('should throw error for invalid state', () => {
      const yaml = `text: Task
state: invalid_state`;

      const existingTask = new Task('Task');
      const childrenMap = new Map();

      expect(() => {
        importTaskFromYaml(yaml, existingTask, childrenMap);
      }).toThrow('Invalid state');
    });
  });
});
