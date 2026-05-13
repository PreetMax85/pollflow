import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * IUser — the TypeScript interface for a User document.
 *
 * Using _id as string is intentional — Mongoose ObjectIds serialize to strings
 * in JSON responses, and our JWT payload uses userId: string. Keeping the type
 * consistent throughout prevents subtle bugs where a number comparison fails
 * against a string ObjectId.
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;

  // Password reset fields — undefined when no reset is in progress.
  // Using undefined (not null) to match exactOptionalPropertyTypes in tsconfig.
  resetToken?: string;
  resetTokenExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * IUserMethods — instance methods on the User document.
 * We keep business logic out of the schema, but utility methods that are
 * tightly coupled to the document structure (like field presence checks)
 * can live here.
 */
interface IUserMethods {
  toSafeObject(): { id: string; name: string; email: string };
}

type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
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
      unique: true, // creates a unique index — duplicate email → MongoServerError code 11000
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
    // where the field exists. This is efficient since most users won't have
    // a reset token at any given time.
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
    // whenever .toJSON() is called (which res.json() does automatically).
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

/**
 * Instance method — returns a plain object with only safe, public fields.
 * Use this instead of spreading the full document into API responses.
 *
 * Usage in service:
 *   const user = await User.findById(id);
 *   return user.toSafeObject();
 */
userSchema.methods.toSafeObject = function (this: IUser): {
  id: string;
  name: string;
  email: string;
} {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
  };
};

/**
 * Index strategy:
 * - email: unique index (declared via unique: true above) — O(1) login lookups
 * - resetToken: sparse index (declared above) — O(1) reset token lookups
 * - No compound indexes needed for auth — queries are always by single field
 */

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
