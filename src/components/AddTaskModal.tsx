import React, { useState } from "react";
import { Card, CardContent, CardHeader, Modal, TextField } from "@mui/material";
import { TaskID } from "../domain/Task";

interface AddTaskModalProps {
  showAddModal: boolean;
  setShowAddModal: React.Dispatch<React.SetStateAction<boolean>>;
  taskId: TaskID;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  showAddModal,
  setShowAddModal,
  taskId,
}) => {
  const [newTaskName, setTaskName] = useState("");
  const [hasTaskNameError, setHasTaskNameError] = useState(false);
  const [taskNameError, setTaskNameError] = useState<string | undefined>();

  return (
    <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
      <Card sx={{ maxWidth: 500 }}>
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
          />
        </CardContent>
      </Card>
    </Modal>
  );
};
