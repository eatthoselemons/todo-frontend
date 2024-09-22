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
  taskId: TaskID;
  onClose?: () => {};
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  showAddModal,
  setShowAddModal,
  taskId,
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
    (async () => {
      try {
        console.log(taskId);
        let id = await createTask(new Task(newTaskName), taskId);
        console.log(`new id: ${id}`);
      } catch (e) {
        // TODO handle errors
        return;
      }
      setTaskName("");
      close();
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
            value={newTaskName}
            onChange={(e) => setTaskName(e.target.value)}
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
