import React, { useState } from "react";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Modal,
  TextField,
} from "@mui/material";
import { Task, TaskID } from "../domain/Task";
import useTaskHooks from "../hooks/useTaskHooks";

interface AddTaskModalProps {
  showAddModal: boolean;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  parentTaskId: TaskID;
  onClose?: () => {};
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  showAddModal,
  setShowAddModal,
  parentTaskId,
  onClose,
}) => {
  const [newTaskName, setTaskName] = useState("");
  const [hasTaskNameError, setHasTaskNameError] = useState(false);
  const [taskNameError, setTaskNameError] = useState<string | undefined>();

  const { createTask } = useTaskHooks();

  const close = () => {
    onClose?.();
    setShowAddModal(false);
  };

  const submit = () => {
    if (!newTaskName || newTaskName.trim() === "") {
      setHasTaskNameError(true);
      setTaskNameError("Task name is required");
      return;
    }

    setHasTaskNameError(false);
    setTaskNameError(undefined);

    (async () => {
      try {
        console.log("Creating task with parent:", parentTaskId);
        let id = await createTask(new Task(newTaskName), parentTaskId);
        console.log(`new id: ${id}`);
        setTaskName("");
        close();
      } catch (e) {
        console.error("Error creating task:", e);
        setHasTaskNameError(true);
        setTaskNameError("Failed to create task. Please try again.");
      }
    })();
  };

  return (
    <Modal open={showAddModal} onClose={close}>
      <Card sx={{ maxWidth: 500, margin: "auto", marginTop: "25vh" }}>
        <CardHeader title="Add New Todo" />
        <CardContent>
          <TextField
            required
            label="Task Name"
            variant="filled"
            title="Name of Task"
            fullWidth
            error={hasTaskNameError}
            helperText={taskNameError}
            value={newTaskName}
            onChange={(e) => {
              setTaskName(e.target.value);
              if (hasTaskNameError) {
                setHasTaskNameError(false);
                setTaskNameError(undefined);
              }
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.shiftKey &&
                !e.altKey
              ) {
                e.preventDefault();
                submit();
              }
            }}
          />
        </CardContent>
        <CardActions>
          <Button variant="contained" onClick={submit}>
            Create
          </Button>
        </CardActions>
      </Card>
    </Modal>
  );
};
