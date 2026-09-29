import React from 'react';
import { Box, List, ListItemButton, ListItemText, Collapse, Typography, Divider, Chip, useTheme, Badge, alpha } from '@mui/material';
import { ExpandLess, ExpandMore, Person as PersonIcon, Assessment as AssessmentIcon } from '@mui/icons-material';
import type { RecitationDashboardDto } from '../../services/models/RecitationDashboardDto.ts';
import { formatLocalTime } from '../../utils/timeUtils.ts';

interface StudentProblemViewProps {
    classData: RecitationDashboardDto;
    onSelectProblem: (studentId: string, problemId: string | null) => void;
    selectedStudentId: string | null;
    selectedProblemId: string | null;
    mode?: 'student' | 'problem';
    problemData?: any;
    exportInProgress?: boolean;
}

const StudentProblemView: React.FC<StudentProblemViewProps> = ({
    classData,
    onSelectProblem,
    selectedStudentId,
    selectedProblemId,
    mode = 'student',
    problemData,
    exportInProgress = false,
}) => {
    const [openStudent, setOpenStudent] = React.useState<string | null>(selectedStudentId);
    const [openProblem, setOpenProblem] = React.useState<string | null>(selectedProblemId || null);
    const theme = useTheme();

    const handleStudentClick = (studentId: string) => {
        setOpenStudent(openStudent === studentId ? null : studentId);
        onSelectProblem(studentId, null);
    };

    const handleProblemClick = (problemId: string) => {
        setOpenProblem(openProblem === problemId ? null : problemId);
    };

    React.useEffect(() => {
        if (selectedStudentId) {
            setOpenStudent(selectedStudentId);
        }
    }, [selectedStudentId]);

    React.useEffect(() => {
        if (selectedProblemId) {
            setOpenProblem(selectedProblemId);
        }
    }, [selectedProblemId]);

    const problems = React.useMemo(() => {
        if (mode === 'problem' && problemData && Array.isArray(problemData.problems)) {
            return problemData.problems as Array<{ id: string; title: string; students: { studentId: string; email: string; aiScore: any }[]; totalSubmissions?: number; correctRate?: number }>;
        }
        return [] as Array<{ id: string; title: string; students: { studentId: string; email: string; aiScore: any }[]; totalSubmissions?: number; correctRate?: number }>;
    }, [mode, problemData]);

    const getOverallConfidence = (aiScore: any) => {
        if (!aiScore) return undefined;
        return aiScore.confidenceOverall;
    };

    const renderConfidencePercentage = (aiScore: any) => {
        const confidence = getOverallConfidence(aiScore);
        return typeof confidence === 'number' ? (
            <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                {Math.round(confidence * 100)}%
            </Typography>
        ) : null;
    };

    return (
        <Box sx={{
            width: 320,
            flexShrink: 0,
            borderRight: 1,
            borderColor: 'divider',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'white',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)'
        }}>
            <Box sx={{
                p: 2,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: theme.palette.primary.main,
                color: 'white',
                flexShrink: 0,
                height: 72,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography noWrap sx={{
                            fontWeight: "bold"
                        }}>{classData.className}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }} noWrap>
                            {classData.recitationTitle} - {formatLocalTime(classData.recitationDate)}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <List
                    component="nav"
                    disablePadding
                >
                    {mode === 'student' ? (
                        classData.students.map((student) => (
                        <React.Fragment key={student.id}>
                            <ListItemButton
                                onClick={() => handleStudentClick(student.id)}
                                sx={{
                                    height: 60,
                                    p: 2,
                                    borderLeft: openStudent === student.id ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                        transform: 'translateX(2px)'
                                    },
                                    '&.Mui-selected': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                                        borderLeft: `4px solid ${theme.palette.primary.main}`
                                    }
                                }}
                                selected={openStudent === student.id}
                            >
                                <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                    <Badge
                                        overlap="circular"
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                        badgeContent={
                                            <Box
                                                sx={{
                                                    width: 18,
                                                    height: 18,
                                                    borderRadius: '50%',
                                                    bgcolor: student.overallPerformance.overallScore >= 2.4
                                                        ? theme.palette.success.main
                                                        : student.overallPerformance.overallScore >= 1.8
                                                            ? theme.palette.warning.main
                                                            : theme.palette.error.main,
                                                    border: `2px solid ${theme.palette.background.paper}`
                                                }}
                                            />
                                        }
                                    >
                                        <PersonIcon color={openStudent === student.id ? "primary" : "action"} />
                                    </Badge>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <Typography
                                        variant="body1"
                                        color={openStudent === student.id ? theme.palette.primary.main : "textPrimary"}
                                        sx={{
                                            fontWeight: openStudent === student.id ? "bold" : "medium",
                                            fontSize: '0.95rem'
                                        }}>
                                        {student.email}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                color: "text.secondary",
                                                fontSize: '0.75rem'
                                            }}>
                                            Overall: {student.overallPerformance.overallScore}/5
                                        </Typography>
                                        {typeof (student as any).overallPerformance?.teacherOverall === 'number' && (
                                            <Chip size="small" label={`Teacher: ${(student as any).overallPerformance.teacherOverall}/5`} color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />
                                        )}
                                    </Box>
                                </Box>
                                {openStudent === student.id ? <ExpandLess color="primary" /> : <ExpandMore />}
                            </ListItemButton>
                            <Collapse in={openStudent === student.id} timeout="auto" unmountOnExit>
                                <List component="div" disablePadding>
                                    {/* Overall Assessment unfinished, do not delete */}
                                    {/* <ListItemButton
                                        sx={{
                                            pl: 6,
                                            pr: 2,
                                            py: 1.5,
                                            transition: 'all 0.2s ease',
                                            '&.Mui-selected': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                borderLeft: `3px solid ${theme.palette.primary.main}`,
                                                fontWeight: 'bold'
                                            },
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                transform: 'translateX(2px)'
                                            }
                                        }}
                                        selected={selectedStudentId === student.id && selectedProblemId === null}
                                        onClick={() => onSelectProblem(student.id, null)}
                                    >
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <AssessmentIcon fontSize="small" sx={{ mr: 1, color: theme.palette.primary.main }} />
                                                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.875rem' }}>
                                                        Overall Assessment
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                    </ListItemButton> */}

                                    {student.performances.map(performance => (
                                        <ListItemButton
                                            key={performance.problemId}
                                            sx={{
                                                pl: 6,
                                                pr: 2,
                                                py: 1.5,
                                                transition: 'all 0.2s ease',
                                                '&.Mui-selected': {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                    borderLeft: `3px solid ${theme.palette.primary.main}`,
                                                    fontWeight: 'bold'
                                                },
                                                '&:hover': {
                                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                    transform: 'translateX(2px)'
                                                }
                                            }}
                                            selected={selectedStudentId === student.id && selectedProblemId === performance.problemId}
                                            onClick={() => onSelectProblem(student.id, performance.problemId)}
                                        >
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Typography
                                                            variant="body2"
                                                            title={performance.problemTitle}
                                                            sx={{
                                                                fontWeight: "medium",
                                                                mr: 1,
                                                                fontSize: '0.875rem',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                                flex: 1,
                                                                minWidth: 0
                                                            }}>
                                                            {performance.problemTitle}
                                                        </Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                            {typeof (performance.aiScore as any).teacherOverall === 'number' && (
                                                                <Chip size="small" label={(performance.aiScore as any).teacherOverall} color="primary" sx={{ height: 20 }} />
                                                            )}
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: "bold",
                                                                    fontSize: '0.875rem',

                                                                    color: performance.aiScore.overall >= 2.4 ? theme.palette.success.main :
                                                                           performance.aiScore.overall >= 1.8 ? theme.palette.warning.main : theme.palette.error.main
                                                                }}>
                                                                {performance.aiScore.overall}
                                                            </Typography>
                                                            {/* Confidence percent */}
                                                            {renderConfidencePercentage(performance.aiScore)}
                                                        </Box>
                                                    </Box>
                                                }
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Collapse>
                            <Divider sx={{ opacity: 0.3 }} />
                        </React.Fragment>
                        ))
                    ) : (
                        problems.map((problem) => (
                            <React.Fragment key={problem.id}>
                                <ListItemButton
                                    onClick={() => handleProblemClick(problem.id)}
                                    sx={{
                                        height: 60,
                                        p: 2,
                                        borderLeft: openProblem === problem.id ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            transform: 'translateX(2px)'
                                        },
                                        '&.Mui-selected': {
                                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                                            borderLeft: `4px solid ${theme.palette.primary.main}`
                                        }
                                    }}
                                    selected={openProblem === problem.id}
                                >
                                    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                                        <AssessmentIcon color={openProblem === problem.id ? 'primary' : 'action'} />
                                    </Box>
                                    <ListItemText
                                        primary={
                                            <Typography
                                                variant="body1"
                                                color={openProblem === problem.id ? theme.palette.primary.main : 'textPrimary'}
                                                title={problem.title}
                                                sx={{
                                                    fontWeight: openProblem === problem.id ? 'bold' : 'medium',
                                                    fontSize: '0.95rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '100%'
                                                }}>
                                                {problem.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: "text.secondary",
                                                    fontSize: '0.75rem'
                                                }}>
                                                {problem.students.length} submissions
                                            </Typography>
                                        }
                                    />
                                    {openProblem === problem.id ? <ExpandLess color="primary" /> : <ExpandMore />}
                                </ListItemButton>
                                <Collapse in={openProblem === problem.id} timeout="auto" unmountOnExit>
                                    <List component="div" disablePadding>
                                        {problem.students.map((s) => (
                                            <ListItemButton
                                                key={s.studentId}
                                                sx={{
                                                    pl: 6,
                                                    pr: 2,
                                                    py: 1.5,
                                                    transition: 'all 0.2s ease',
                                                    '&.Mui-selected': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.15),
                                                        borderLeft: `3px solid ${theme.palette.primary.main}`,
                                                        fontWeight: 'bold'
                                                    },
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                                                        transform: 'translateX(2px)'
                                                    }
                                                }}
                                                selected={selectedProblemId === problem.id && selectedStudentId === s.studentId}
                                                onClick={() => onSelectProblem(s.studentId, problem.id)}
                                            >
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: "medium",
                                                                    mr: 1,
                                                                    fontSize: '0.875rem'
                                                                }}>
                                                                {s.email}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                                                {typeof (s.aiScore as any).teacherOverall === 'number' && (
                                                                    <Chip size="small" label={(s.aiScore as any).teacherOverall} color="primary" sx={{ height: 20 }} />
                                                                )}
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{
                                                                        fontWeight: "bold",
                                                                        fontSize: '0.875rem',

                                                                        color: (s.aiScore?.overall ?? 0) >= 2.4 ? theme.palette.success.main :
                                                                               (s.aiScore?.overall ?? 0) >= 1.8 ? theme.palette.warning.main : theme.palette.error.main
                                                                    }}>
                                                                    {s.aiScore?.overall}
                                                                </Typography>
                                                                {/* Confidence percent */}
                                                                {renderConfidencePercentage(s.aiScore)}
                                                            </Box>
                                                        </Box>
                                                    }
                                                />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Collapse>
                                <Divider sx={{ opacity: 0.3 }} />
                            </React.Fragment>
                        ))
                    )}
                </List>
            </Box>
        </Box>
    );
};

export default StudentProblemView;
