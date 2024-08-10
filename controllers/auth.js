import { sendWelcomeEmail, sendPasswordResetEmail } from "../helpers/email.js";
import validator from "email-validator";
import User from "../models/user.js";
import { hashPassword, comparePassword } from "../helpers/auth.js";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import user from "../models/user.js";

export const api = async (req, res) => {
  return res.json({ user: req.user });
};
export const register = async (req, res) => {
  let { email, password } = req.body;

  // Validate email
  if (!validator.validate(email)) {
    return res.json({ error: "A valid email is required" });
  }
  if (!email?.trim()) {
    return res.json({ error: "A valid email is required" });
  }

  // Validate password
  if (!password?.trim() || password.length < 6) {
    return res.json({ error: "Password should be at least 6 characters long" });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ error: "Email is already taken" });
    }

    // Send welcome email
    await sendWelcomeEmail(email);

    // Create new user
    const newUser = await User.create({
      email,
      password: await hashPassword(password),
      username: nanoid(6),
    });

    // Generate JWT token
    const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    newUser.password = undefined;

    // Return the new user and token
    return res.json({
      user: newUser,
      token,
    });
  } catch (err) {
    console.log(err);
    res.json({ error: "Something went wrong. Try again!" });
  }
};

export const login = async (req, res) => {
  let { email, password } = req.body;
  if (!validator.validate(email)) {
    return res.json({ error: "A valid email is required" });
  }
  if (!email?.trim()) {
    return res.json({ error: "A valid email is required" });
  }
  if (password?.trim() && password.length < 6) {
    return res.json({ error: "Password should be at least 6 characters long" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      try {
        await sendWelcomeEmail(email);
        const createdUser = await User.create({
          email,
          password: await hashPassword(password),
          username: nanoid(6),
        });

        const token = jwt.sign(
          { _id: createdUser._id },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d",
          }
        );
        createdUser.password = undefined;
        return res.json({
          user: createdUser,
          token,
        });
      } catch (err) {
        return res.json({ error: "Invalid email." });
      }
    } else {
      const match = await comparePassword(password, user.password);
      if (!match) {
        return res.json({ error: "Wrong password" });
      } else {
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
          expiresIn: "1w",
        });

        user.password = undefined;
        return res.json({ user, token });
      }
    }
  } catch (err) {
    console.log(err);
    res.json({ error: "Something went wrong. Try again!" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      return res.json({ error: "email not found!" });
    } else {
      const password = nanoid(6);
      user.password = await hashPassword(password);
      await user.save();

      //send email
      try {
        await sendPasswordResetEmail(email, password);
        return res.json({ message: "Please check your email" });
      } catch (err) {
        return res.json({ error: "something wrong!" });
      }
    }
  } catch (err) {
    console.log(err);
  }
};

export const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.password = undefined;
    res.json(user);
  } catch (err) {
    console.log(err);
  }
};

export const updatePassword = async (req, res) => {
  try {
    let { password } = req.body;

    password = password ? password.trim() : "";

    if (!password) {
      return res.json({ error: "Password is required" });
    }

    if (password.length < 6) {
      return res.json({
        error: "Password should be minimum 6 characters long",
      });
    }

    const user = await User.findById(req.user._id);
    const hashedPassword = await hashPassword(password);

    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
    });

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res
      .status(403)
      .json({ error: "An error occured while updating the password" });
  }
};

export const updateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: "Username is required" });
    }

    const trimmedUsername = username.trim();

    const existingUser = await User.findOne({
      username: trimmedUsername,
    });

    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const updatedUser = await user.findByIdAndUpdate(
      req.user._id,
      { username: trimmedUsername },
      { new: true, runValidator: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Update failed. Try again!" });
    }

    updatedUser.password = undefined;
    updatedUser.resetCode = undefined;

    res.json(updatedUser);
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(400).json({ error: "Username is already taken" });
    } else {
      return res
        .status(500)
        .json({ error: "An error occurred while updating the profile" });
    }
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, company, address, about, photo, logo } = req.body;
    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (phone) updateFields.phone = phone.trim();
    if (company) updateFields.company = company.trim();
    if (address) updateFields.address = address.trim();
    if (about) updateFields.about = about.trim();
    if (photo) updateFields.photo = photo;
    if (logo) updateFields.logo = logo;
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedUser) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    updatedUser.password = undefined;
    res.json(updatedUser);
  } catch (err) {
    console.log(err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        error: err.message,
      });
    }
    return res.status(500).json({
      error: "Server error",
    });
  }
};
