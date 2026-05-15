import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;

  // Password reset fields — undefined when no reset is in progress.
  resetToken?: string;
  resetTokenExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // creates a unique index
      lowercase: true, // always stored lowercase; normalized at the DB layer
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      // select: false is intentionally NOT set here — we need the password in
      // AuthRepository.findByEmail() for login. We control exclusion at the
      // repository layer instead of here.
    },

    // Reset token fields — sparse index means the index only tracks documents
    // where the field exists.
    resetToken: {
      type: String,
      sparse: true,
      index: true,
    },

    resetTokenExpiresAt: {
      type: Date,
      sparse: true,
    },
  },
  {
    timestamps: true, // auto-manages createdAt + updatedAt

    // Transform output to remove sensitive fields and rename _id to id
    // whenever .toJSON() is called.
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret["id"] = ret["_id"];
        delete ret["_id"];
        delete ret["__v"];
        delete ret["password"];
        delete ret["resetToken"];
        delete ret["resetTokenExpiresAt"];
        return ret;
      },
    },
  },
);

export const User = mongoose.model<IUser>("User", userSchema);
