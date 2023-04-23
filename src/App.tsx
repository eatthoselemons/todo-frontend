import React, { useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  Container,
  IconButton,
  Modal,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import TaskList from "./components/TaskList";
import { AddTaskModal } from "./components/AddTaskModal";

function App() {
  const [showAddModal, setShowAddModal] = useState(false);
  return (
    <Container>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h3">Liz'z Lemons</Typography>
        <Box
          sx={{
            display: "flex",
            flex: "1 0 auto",
            justifyContent: "space-between",
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              marginLeft: "auto",
            }}
          >
            <IconButton aria-label="delete" size="large">
              <Delete fontSize="inherit" color="error" />
            </IconButton>
            <IconButton
              aria-label="add"
              size="large"
              onClick={() => setShowAddModal(true)}
            >
              <Add fontSize="inherit" />
            </IconButton>
            {/*TODO change state*/}
          </Stack>
        </Box>
      </Box>

      {/* Content */}
      <main>
        <TaskList taskIDs={["root"]} />
      </main>
      {/* Modal */}
      <AddTaskModal
        taskId="root"
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
      />
    </Container>
  );
}

export default App;
