import mongoose from "mongoose";

const { Schema, ObjectId, model } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: true,
      min: 6,
      max: 64,
    },
    role: {
      type: [String],
      default: ["Buyer"],
      enum: ["Buyer", "Seller", "Author", "Admin"],
    },
    photo: {},
    logo: {},
    company: { type: String, default: "" },
    phone: { type: String, default: "" },
    enquiredProperties: [{ type: ObjectId, ref: "Ad" }],
    wishlist: [{ type: ObjectId, ref: "Ad" }],
    about: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });
export default model("User", userSchema);
