import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDepartment extends Document {
  departmentId: string;
  namaDepartemen: string;
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
  },
  {
    timestamps: true,
  }
);

const Department: Model<IDepartment> =
  mongoose.models.Department ||
  mongoose.model<IDepartment>("Department", DepartmentSchema);

export default Department;
