import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDepartment extends Document {
  departmentId: string;
  namaDepartemen: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    departmentId: {
      type: String,
      required: [true, "Department ID wajib diisi"],
      unique: true,
      trim: true,
    },
    namaDepartemen: {
      type: String,
      required: [true, "Nama Departemen wajib diisi"],
      trim: true,
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

const Department: Model<IDepartment> =
  mongoose.models.Department ||
  mongoose.model<IDepartment>("Department", DepartmentSchema);

export default Department;
