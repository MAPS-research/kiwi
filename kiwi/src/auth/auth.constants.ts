export const jwtConstants = {
  secret: process.env.JWT_SECRET,
};

export const jwtExpiration = {
  accessToken: 60, // 60 seconds
  refreshToken: 60 * 60 * 24 * 7, // 7 days
};
