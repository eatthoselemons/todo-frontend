import { Box, Fab, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import React, { FormEventHandler } from "react";

export interface AddTaskComponentProps {
  handleNewItem: FormEventHandler;
}

export const AddTaskComponent = React.forwardRef<
  HTMLTextAreaElement,
  AddTaskComponentProps
>(({ handleNewItem }, ref) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
      }}
    >
      <Box
        component="form"
        onSubmit={handleNewItem}
        sx={{
          flex: "1",
        }}
      >
        <TextField
          label="New Item"
          variant="standard"
          autoFocus
          autoComplete="on"
          autoCapitalize="words"
          inputRef={ref}
          fullWidth={true}
        />
      </Box>
      <Fab
        color="primary"
        sx={{
          m: 1,
          mr: 0,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
});
