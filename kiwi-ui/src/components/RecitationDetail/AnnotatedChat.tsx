import React from 'react';
import { Box, Paper, Typography, Chip, Tooltip, useTheme, Avatar, ButtonGroup, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import {
    Lightbulb as LightbulbIcon,
    Person as PersonIcon,
    SmartToy as BotIcon,
    ThumbUp as ThumbUpIcon,
    ThumbDown as ThumbDownIcon
} from '@mui/icons-material';

interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    annotation?: {
        skill: 'Problem Decomposition' | 'Debugging and Reasoning' | 'Concept Understanding' | 'AI Learning Effectiveness' | 'Task Completion' | 'Basic Syntax Usage' | 'Effort and Participation' | 'Code Clarity and Cleanliness';
        justification: string;
        teacherFeedback?: 'fair' | 'unfair';
        teacherComment?: string;
    };
}

interface AnnotatedChatProps {
    chatHistory: ChatMessage[];
    allowFeedback?: boolean;
    onSubmitFeedback?: (args: { messageId: string; feedback: 'fair' | 'unfair'; comment: string }) => Promise<void>;
    studentMode?: boolean;
}

const AnnotatedChat: React.FC<AnnotatedChatProps> = ({ chatHistory, allowFeedback = false, onSubmitFeedback, studentMode = false }) => {
    const theme = useTheme();
    const [openDialog, setOpenDialog] = React.useState(false);
    const [currentMsgId, setCurrentMsgId] = React.useState<string | null>(null);
    const [feedbackType, setFeedbackType] = React.useState<'fair' | 'unfair' | null>(null);
    const [comment, setComment] = React.useState('');

    const handleFeedbackClick = (msgId: string, type: 'fair' | 'unfair') => {
        setCurrentMsgId(msgId);
        setFeedbackType(type);
        setComment('');
        setOpenDialog(true);
    };

    const handleSubmitFeedback = async () => {
        if (currentMsgId && feedbackType) {
            try {
                if (onSubmitFeedback) {
                    await onSubmitFeedback({ messageId: currentMsgId, feedback: feedbackType, comment });
                }
                const msgIndex = chatHistory.findIndex(msg => msg.id === currentMsgId);
                if (msgIndex !== -1 && chatHistory[msgIndex].annotation) {
                    chatHistory[msgIndex].annotation!.teacherFeedback = feedbackType;
                    chatHistory[msgIndex].annotation!.teacherComment = comment;
                }
            } catch (e) {
                console.log('Failed to submit feedback', e);
            }
        }
        setOpenDialog(false);
    };

    return (
        <Box>
            {chatHistory.map((msg) => {
                const isUser = msg.sender === 'user';
                const hasAnnotation = !!msg.annotation;
                const hasFeedback = hasAnnotation && !!msg.annotation?.teacherFeedback;

                return (
                    <Box
                        key={msg.id}
                        sx={{
                            display: 'flex',
                            justifyContent: isUser ? 'flex-end' : 'flex-start',
                            mb: 2,
                            position: 'relative'
                        }}
                    >
                        {!isUser && (
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    mr: 1,
                                    bgcolor: theme.palette.primary.main
                                }}
                            >
                                <BotIcon fontSize="small" />
                            </Avatar>
                        )}

                        <Box sx={{ maxWidth: '75%', display: 'flex', flexDirection: 'column' }}>
                            <Paper
                                elevation={hasAnnotation && isUser ? 3 : 1}
                                sx={{
                                    p: 1.5,
                                    bgcolor: hasAnnotation && isUser
                                        ? (theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(33, 150, 243, 0.08)')
                                        : (isUser
                                            ? (theme.palette.mode === 'dark' ? 'rgba(129, 199, 132, 0.16)' : 'rgba(129, 199, 132, 0.08)')
                                            : (theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100])),
                                    color: 'text.primary',
                                    border: hasAnnotation && isUser ? `1px solid ${theme.palette.primary.main}` : 'none',
                                    position: 'relative',
                                    borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                }}
                            >
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>
                                {hasAnnotation && msg.annotation && isUser && (
                                    <Tooltip title={`${msg.annotation.skill}: ${msg.annotation.justification}`} placement="top">
                                        <Chip
                                            icon={<LightbulbIcon fontSize="small" />}
                                            label={msg.annotation.skill}
                                            size="small"
                                            color={hasFeedback && msg.annotation.teacherFeedback === 'unfair' ? 'error' : 'primary'}
                                            sx={{
                                                position: 'absolute',
                                                top: -10,
                                                right: isUser ? 'auto' : -5,
                                                left: isUser ? -5 : 'auto',
                                                boxShadow: 2,
                                                fontSize: '0.7rem',
                                                height: 22
                                            }}
                                        />
                                    </Tooltip>
                                )}
                            </Paper>

                            {/* Teacher feedback buttons for annotated messages */}
                            {(allowFeedback || studentMode) && hasAnnotation && msg.annotation && isUser && (
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: isUser ? 'flex-start' : 'flex-end',
                                    mt: 0.5,
                                    alignItems: 'center',
                                    gap: 1
                                }}>
                                    {hasFeedback ? (
                                        <Chip
                                            size="small"
                                            label={msg.annotation.teacherFeedback === 'fair' ? 'Fair' : 'Unfair'}
                                            color={msg.annotation.teacherFeedback === 'fair' ? 'success' : 'error'}
                                            variant="outlined"
                                        />
                                    ) : (
                                        <ButtonGroup size="small" variant="outlined">
                                            <Button
                                                startIcon={<ThumbUpIcon />}
                                                color="success"
                                                onClick={() => handleFeedbackClick(msg.id, 'fair')}
                                            >
                                                Fair
                                            </Button>
                                            <Button
                                                startIcon={<ThumbDownIcon />}
                                                color="error"
                                                onClick={() => handleFeedbackClick(msg.id, 'unfair')}
                                            >
                                                Unfair
                                            </Button>
                                        </ButtonGroup>
                                    )}

                                    {hasFeedback && msg.annotation.teacherComment && (
                                        <Tooltip title={msg.annotation.teacherComment}>
                                            <Chip
                                                label="Comment"
                                                size="small"
                                                variant="outlined"
                                                color="default"
                                            />
                                        </Tooltip>
                                    )}
                                </Box>
                            )}
                        </Box>

                        {isUser && (
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    ml: 1,
                                    bgcolor: theme.palette.secondary.main
                                }}
                            >
                                <PersonIcon fontSize="small" />
                            </Avatar>
                        )}
                    </Box>
                );
            })}

            {/* Feedback Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
                <DialogTitle>
                    {feedbackType === 'fair' ? 'Confirm Fair Assessment' : 'Mark Assessment as Unfair'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {feedbackType === 'fair'
                                ? 'You are marking this annotation as fair. Would you like to add a comment?'
                                : 'Please explain why you think this annotation is unfair:'}
                        </Typography>
                        <TextField
                            label="Comment"
                            multiline
                            rows={3}
                            fullWidth
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required={feedbackType === 'unfair'}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmitFeedback}
                        variant="contained"
                        color={feedbackType === 'fair' ? 'success' : 'error'}
                        disabled={feedbackType === 'unfair' && !comment}
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AnnotatedChat;
