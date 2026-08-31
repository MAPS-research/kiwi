import { Card, CardContent, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';

type LectureCardProps = {
  id: string;
  lectureNumber: string;
  lectureTitle: string;
  instructor: string;
  description: string;
};

const StyledLink = styled(RouterLink)(({ theme }) => ({
  width: '100%', // Let the grid cell set the card width
  display: 'block',
  textDecoration: 'none',
}));

const LectureCard = ({
  id,
  lectureNumber,
  lectureTitle,
  instructor,
  description,
}: LectureCardProps) => {
  return (
    <StyledLink to={`/lecture/${id}`}>
      <Card
        sx={{
          backgroundColor: '#fff',
          borderRadius: 2,
          boxShadow: 2,
          // Thick top border in #4F355E
          borderTop: '24px solid #4F355E',
          transition: 'transform 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4,
          },
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '220px', // adjust this to fit your design
            pt: '20px',
            pb: '44px',
          }}
        >
          {/* Top area */}
          <Typography variant="subtitle1" fontWeight={600}>
            {lectureNumber}
          </Typography>

          <Typography variant="h6" fontWeight={700} sx={{ mt: 1 }}>
            {lectureTitle}
          </Typography>

          <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
            {instructor}
          </Typography>

          {/* Flexible spacer - grows to push the description down */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Bottom area (pinned to bottom of the Card via flexGrow above) */}
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </CardContent>
      </Card>
    </StyledLink>
  );
};

export default LectureCard;
