import React from "react";
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { ChevronRight as ChevronRightIcon} from "@mui/icons-material";
import { ReactElement } from "react";

const activeBg = "#d8c5e0";
const hoverBg = "#cfb8da";
const activeColor = "#3b2a4b";

type SidebarItemProps = {
  icon: ReactElement;
  label: string;
  href?: string;
  active?: boolean;
};

const SidebarItem = ({
  icon,
  label,
  href,
  active = false,
}: SidebarItemProps) => {
  const isLink = Boolean(href);

  return (
    <ListItemButton
      selected={active}
      component={isLink ? "a" : "div"}
      href={href}
      sx={{
        pl: 1.5,
        pr: 1.5,
        py: 1,
        mb: 1, // same bottom margin for each item
        borderRadius: 2,
        color: active ? activeColor : "#fff",
        transition: "background-color 0.25s ease-in-out, color 0.25s ease-in-out",
        "& .MuiListItemIcon-root": {
          color: active ? activeColor : "#fff",
          transition: "color 0.25s ease-in-out",
          display: "flex",
          justifyContent: "center",
        },
        "&:hover": {
          backgroundColor: hoverBg,
          color: activeColor,
          "& .MuiListItemIcon-root": {
            color: activeColor,
          },
        },
        "&.Mui-selected": {
          backgroundColor: activeBg,
        },
        "&.Mui-selected:hover": {
          backgroundColor: hoverBg,
        },
      }}
    >
      <ListItemIcon
        sx={{ minWidth: 36, display: "flex", justifyContent: "center" }}
      >
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={<Typography fontWeight={active ? 600 : 400}>{label}</Typography>}
      />
      {active && (
        <ChevronRightIcon sx={{ color: activeColor }} />
      )}
    </ListItemButton>
  );
};

export default SidebarItem;
