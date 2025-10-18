class TaskNotFoundError extends Error {
  constructor(msg: string) {
    super(msg);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TaskNotFoundError.prototype);
  }
}

export default TaskNotFoundError;
