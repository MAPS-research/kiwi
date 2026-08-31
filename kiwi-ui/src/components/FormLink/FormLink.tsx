// components/FormLink/FormLink.tsx
import React from "react";
import { Link as MuiLink, LinkProps as MuiLinkProps } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

interface FormLinkProps extends MuiLinkProps {
  to?: string; // for react-router link
  href?: string; // for external link
  fontWeight?: number;
}

const FormLink: React.FC<FormLinkProps> = ({
  to,
  href,
  children,
  fontWeight = 400,
  sx = {},
  ...rest
}) => {
  const isInternal = !!to;

  return (
    <MuiLink
      component={isInternal ? RouterLink : "a"}
      to={isInternal ? to : undefined}
      href={!isInternal ? href : undefined}
      underline="none"
      sx={{
        color: "#fff",
        cursor: "pointer",
        fontWeight,
        borderBottom: "1px solid transparent",
        transition: "border-color 0.3s ease-in-out",
        '&:hover': {
          borderBottom: "1px solid #fff",
        },
        ...sx,
      }}
      {...rest}
    >
      {children}
    </MuiLink>
  );
};

export default FormLink;
