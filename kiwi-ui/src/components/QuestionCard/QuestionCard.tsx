// /src/components/QuestionCard/QuestionCard.tsx
import React, { useState } from "react";
import apiClient from "../../utils/api.ts";
import { Card, CardContent, Typography, Box, Avatar, Stack, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ThumbUp, ExpandLess } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax";
// import "katex/dist/katex.min.css"; // Import KaTeX CSS for styling equations



export interface QuestionCardProps {
  id: string;
  prompt: string;
  answer: string;
  numUpvotes: number;
  upvoted: boolean;
  time: Date;
  instructorApproved: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
    id,
    prompt,
    answer,
    numUpvotes,
    upvoted,
    time,
    instructorApproved,
  }) => {
    const theme = useTheme();
  
    // State to track whether the card is expanded
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentNumUpvotes, setCurrenNumUpvotes] = useState(numUpvotes);
    const [hasUpvoted, setHasUpvoted] = useState(upvoted);

    // Preprocess the Markdown content to escape backslashes
    const preprocessMarkdown = (content: string): string => {
        // the following is not perfect, but it works for most cases
        // the problem is that it should only replace "\" into "\\" inside the equation
        // idealy, we should either have a parser that works with \(\) or \[\]
        // replace \( \) with $ $
        // replace \[\] with $$ $$ $$
        // replace \ with \\
        return content
            .replace(/\\\[(.*?)\\\]/g, "$$ $1 $$") // Replace \[ \] with $$ $$
            .replace(/\\\((.*?)\\\)/g, "$ $1 $") // Replace \( \) with $ $
            .replace(/\\/g, "\\"); // Escape backslashes
    };

    // Custom components to fix invalid nesting
    // TODO: fix this for more general case
    const markdownComponents = {
        p: ({ node, children }: any) => {
        const hasBlockChild =
            node.children && node.children.some((child: any) => 
                ["ol", "ul", "pre", "p", "h1", "h2", "h3", "h4", "h5", "h6"].includes(child.tagName));
        return hasBlockChild ? <div>{children}</div> : children;
        },
    };
  
    // Helper function to produce a human-readable "time ago" string.
    const formatTimeAgo = (date: Date): string => {
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      if (seconds < 60) return "Just now";
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    };

    // Handle upvote button click
    const handleUpvote = async () => {
        if (!hasUpvoted) {
            setCurrenNumUpvotes((prev) => prev + 1);
            setHasUpvoted(true);
            // Call API to upvote the question
        } else {
            setCurrenNumUpvotes((prev) => prev - 1);
            setHasUpvoted(false);
        }
        await apiClient.interactionControllerToggleUpvote({
            toggleUpvoteRequest: {
                id: id,
            },
        });
    };
  
    return (
      <Card
        onClick={() => {
            if (!isExpanded) {
                setIsExpanded(true);
            }
        }
            // if (!isExpanded) {

            // setIsExpanded((prev) => !prev)
        } // Toggle expansion on click
        sx={{
          height: "100%",
          backgroundColor: "#fff",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          borderRadius: 2,
          borderLeft: `8px solid ${theme.palette.primary.light}`,
          overflow: "hidden",
          transition: "transform 0.2s",
          cursor: isExpanded ? "default" : "pointer",
          "&:hover": {
            transform: "translateY(-4px)",
          },
        }}
      >
        <CardContent
          sx={{
            p: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >

          {/* User message, clamped to three lines */}
          <Typography
            variant="h6"
            sx={{
              mb: 0,
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              WebkitLineClamp: 3,
            }}
          >
            {prompt}
          </Typography>
          
  
          {/* Conditionally render the answer if the card is expanded */}
          {isExpanded && (
            <Typography
              variant="body1"
              component="div"
              sx={{
                mt: 0,
                color: "text.primary",
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkMath]} // Enable math parsing
                rehypePlugins={[rehypeMathjax]} // Enable math rendering
                components={markdownComponents} // Fix invalid nesting
                >
                {preprocessMarkdown(answer)}
              </ReactMarkdown>
            </Typography>
          )}
  
          {/* Row for Viewed/Comments text */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 0
            }}>
            <Typography variant="body2" sx={{
              color: "text.secondary"
            }}>
              {currentNumUpvotes} Upvoted, Asked {formatTimeAgo(time)}{" "}
              {instructorApproved ? "Instructor Approved" : null}
            </Typography>

            {/* Upvote Button */}

            {isExpanded && (
                <Box>
                <IconButton
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(false);
                    }}
                    sx={{
                    color: hasUpvoted ? theme.palette.primary.main : "text.secondary",
                    }}
                    size="small"
                    aria-label="expandless"
                >
                    <ExpandLess />
                </IconButton>
                
                <IconButton
                    onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering card expansion
                    handleUpvote();
                    }}
                    sx={{
                    color: hasUpvoted ? theme.palette.primary.main : "text.secondary",
                    }}
                    size="small"
                    aria-label="upvote"
                >
                    <ThumbUp />
                </IconButton>
                </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };
  
  export default QuestionCard;
