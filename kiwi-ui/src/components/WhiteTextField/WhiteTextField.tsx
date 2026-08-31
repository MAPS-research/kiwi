// components/WhiteTextField/WhiteTextField.tsx
import React from "react";
import { TextField, TextFieldProps, useTheme } from "@mui/material";

const WhiteTextField: React.FC<TextFieldProps> = ({ InputProps, InputLabelProps, ...props }) => {
  const theme = useTheme();

  return (
    <TextField
      fullWidth
      margin="normal"
      InputLabelProps={{
        style: { color: theme.palette.common.white },
        ...InputLabelProps,
      }}
      InputProps={{
        style: { color: theme.palette.common.white, height: 44 },
        inputProps: { style: { paddingTop: 10, paddingBottom: 10 } },
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
        ...InputProps,
      }}
      {...props}
    />
  );
};

export default WhiteTextField;
