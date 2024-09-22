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

interface MenuModalProps {
  showMenuModal: boolean;
  setShowMenuModal: React.Dispatch<React.SetStateAction<boolean>>;
  taskId: TaskID;
  onClose?: () => {};
}

export const MenuModal: React.FC<MenuModalProps> = ({
  showMenuModal,
  setShowMenuModal,
  taskId,
  onClose,
}) => {
  const { clearSubTasks } = useTaskHooks();

  const close = () => {
    onClose?.();
    setShowMenuModal(false);
  };

  const submit = () => {
    (async () => {
      try {
        await clearSubTasks(taskId);
      } catch (e) {
        // TODO handle errors
        return;
      }
      close();
    })();
  };

  return (
    <Modal open={showMenuModal} onClose={close}>
      <Card sx={{ maxWidth: 500, margin: "auto", marginTop: "25vh" }}>
        <CardHeader title="Menu" />
        <CardContent>{taskId}</CardContent>
      </Card>
    </Modal>
  );
};
