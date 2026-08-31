import React from "react";
import { Button, ButtonProps, useTheme } from "@mui/material";

const PrimaryButton: React.FC<ButtonProps> = ({ children, ...props }) => {
  const theme = useTheme();

  return (
    <Button
      fullWidth
      variant="contained"
      sx={{
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.common.white,
        fontWeight: 900,
        borderRadius: 1,
        padding: "10px 0",
        textTransform: "uppercase",
        letterSpacing: 1,
        cursor: "pointer",
        '&:hover': {
          backgroundColor: theme.palette.primary.dark,
        },
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default PrimaryButton;
