// components/WhiteTextField/WhiteTextField.tsx
import React from "react";
import { TextField, TextFieldProps, useTheme } from "@mui/material";

const WhiteTextField: React.FC<TextFieldProps> = ({ slotProps, ...props }) => {
  const theme = useTheme();

  return (
    <TextField
      fullWidth
      margin="normal"
      {...props}
      slotProps={{
        ...slotProps,
        input: (ownerState) => ({
          style: { color: theme.palette.common.white, height: 44 },
          sx: {
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.common.white,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.common.white,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.common.white,
            },
          },
          ...(typeof slotProps?.input === 'function' ? slotProps.input(ownerState) : slotProps?.input),
        }),
        htmlInput: (ownerState) => ({
          style: { paddingTop: 10, paddingBottom: 10 },
          ...(typeof slotProps?.htmlInput === 'function' ? slotProps.htmlInput(ownerState) : slotProps?.htmlInput),
        }),

        inputLabel: (ownerState) => ({
          style: { color: theme.palette.common.white },
          ...(typeof slotProps?.inputLabel === 'function' ? slotProps.inputLabel(ownerState) : slotProps?.inputLabel),
        }),
      }}
    />
  );
};

export default WhiteTextField;
