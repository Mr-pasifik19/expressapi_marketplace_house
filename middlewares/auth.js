import jwt from "jsonwebtoken";
import User from "../models/user.js";
export const requireSignin = (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid token",
    });
  }
};

export const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.role.includes("Admin")) {
      return res.status(403).json({
        error: "Access denied. Admin role required.",
      });
    }
    next();
  } catch (err) {
    console.error("isAdmin middleware error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
