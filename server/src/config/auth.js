const getJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("JWT_SECRET is not configured");
  return "lucky-six-local-development-secret-change-before-production";
};

module.exports = { getJwtSecret };
