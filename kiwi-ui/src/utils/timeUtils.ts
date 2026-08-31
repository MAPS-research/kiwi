export const formatLocalTime = (utcTimeString: string): string => {
    try {
        const date = new Date(utcTimeString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        console.error('Time conversion error:', error);
        return utcTimeString;
    }
};

export const formatRelativeTime = (utcTimeString: string): string => {
    try {
        const date = new Date(utcTimeString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minutes ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hours ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} days ago`;
        }
    } catch (error) {
        console.error('Relative time conversion error:', error);
        return utcTimeString;
    }
};


export const millisecondsToHoursAndMinutes = (milliseconds: number): { hours: number; minutes: number } => {
    const totalMinutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return { hours, minutes };
};
export default millisecondsToHoursAndMinutes;