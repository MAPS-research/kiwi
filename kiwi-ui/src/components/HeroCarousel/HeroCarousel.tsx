import SliderExport from "react-slick";
import { Box, Typography, useMediaQuery } from "@mui/material";
import { useAuth } from "../../auth/AuthContext.tsx";
import { BRAND_LABEL } from "../../config/branding";

// react-slick's CommonJS entry can expose its component under a nested default.
const Slider = (SliderExport as unknown as { default?: typeof SliderExport }).default ?? SliderExport;

const images = [
  { src: "/assets/images/bg-hero-1.svg", alt: "Decorative green gradient" },
  { src: "/assets/images/bg-hero-2.svg", alt: "Decorative blue gradient" },
  { src: "/assets/images/bg-hero-3.svg", alt: "Decorative violet gradient" },
];

const HeroCarousel = () => {
  const { user } = useAuth();
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const userName = user?.username.split("@")[0];
  const welcomeMessage = `Welcome to ${BRAND_LABEL}${userName ? `, ${userName}` : ""}!`;

  const settings = {
    dots: false,
    infinite: true,
    speed: prefersReducedMotion ? 250 : 1200,
    autoplay: true,
    autoplaySpeed: 8000,
    slidesToShow: 1,
    slidesToScroll: 1,
    fade: !prefersReducedMotion,
    arrows: false,
    cssEase: "ease-in-out",
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1440px",
        height: { xs: 208, sm: 236, md: 280 },
        mx: "auto",
        borderRadius: 4,
        overflow: "hidden",
        position: "relative",
        "& .slick-slider, & .slick-list, & .slick-track, & .slick-slide, & .slick-slide > div":
          {
            height: "100%",
          },
      }}
    >
      <Slider {...settings}>
        {images.map((item, index) => (
          <Box
            key={index}
            sx={{
              position: "relative",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <Box
              role="img"
              aria-label={item.alt}
              data-testid="hero-carousel-image"
              sx={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${item.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: prefersReducedMotion ? "none" : "scale(1.015)",
              }}
            />
          </Box>
        ))}
      </Slider>

      <Box
        data-testid="hero-carousel-overlay"
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          display: "flex",
          alignItems: "flex-end",
          p: { xs: 3, sm: 3.5, md: 4.5 },
          background:
            "linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.02) 34%, rgba(0, 0, 0, 0.78) 100%)",
          pointerEvents: "none",
        }}
      >
        <Typography
          component="h1"
          variant="h4"
          sx={{
            m: 0,
            maxWidth: 760,
            color: "common.white",
            fontSize: { xs: "1.35rem", sm: "1.65rem", md: "2rem" },
            lineHeight: 1.25,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {welcomeMessage}
        </Typography>
      </Box>
    </Box>
  );
};

export default HeroCarousel;
