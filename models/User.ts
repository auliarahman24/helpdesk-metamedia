import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  nim_nip: string;
  nama: string;
  password: string;
  role: "mahasiswa" | "admin_departemen" | "superadmin";
  departmentId?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;   // NIM/NIP Super Admin yang menghapus
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    nim_nip: {
      type: String,
      required: [true, "NIM/NIP wajib diisi"],
      unique: true,
      trim: true,
    },
    nama: {
      type: String,
      required: [true, "Nama wajib diisi"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password wajib diisi"],
    },
    role: {
      type: String,
      enum: {
        values: ["mahasiswa", "admin_departemen", "superadmin"],
        message: "Role {VALUE} tidak valid",
      },
      required: [true, "Role wajib diisi"],
      default: "mahasiswa",
    },
    departmentId: {
      type: String,
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
