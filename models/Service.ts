import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// INTERFACES
// ============================================================================

export interface IFormField {
  id: string;
  label: string;
  // type baru: text, textarea, select, file (hapus number & dropdown lama)
  type: "text" | "textarea" | "select" | "file";
  isRequired: boolean;
  options?: string[]; // hanya dipakai saat type === 'select'
}

export interface IService extends Document {
  namaLayanan: string;
  departmentId: string;
  isActive: boolean;        // dipertahankan — Super Admin bisa enable/disable layanan
  isPublic: boolean;        // true = bisa diakses tamu/publik tanpa login
  defaultPrioritas: string; // prioritas SLA berdasarkan layanan
  formBuilder: IFormField[];
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SUB-SCHEMA: Form Field (Arsitektur Fully Dynamic)
// ============================================================================

const FormFieldSchema = new Schema<IFormField>(
  {
    id: {
      type: String,
      required: [true, "ID field wajib diisi"],
    },
    label: {
      type: String,
      required: [true, "Label field wajib diisi"],
    },
    type: {
      type: String,
      enum: {
        values: ["text", "textarea", "select", "file"],
        message: "Tipe field {VALUE} tidak valid. Gunakan: text, textarea, select, file",
      },
      required: [true, "Tipe field wajib diisi"],
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    options: {
      type: [String],
      default: undefined, // hanya ada jika type === 'select'
    },
  },
  {
    _id: false, // sub-doc tidak perlu ObjectId sendiri
  }
);

// ============================================================================
// SCHEMA UTAMA: Service
// ============================================================================

const ServiceSchema = new Schema<IService>(
  {
    namaLayanan: {
      type: String,
      required: [true, "Nama layanan wajib diisi"],
      trim: true,
    },
    departmentId: {
      type: String,
      required: [true, "Department ID wajib diisi"],
    },
    isActive: {
      type: Boolean,
      default: true, // layanan aktif by default
    },
    isPublic: {
      type: Boolean,
      default: false, // by default tidak publik — harus di-enable manual oleh Super Admin
    },
    defaultPrioritas: {
      type: String,
      enum: ["Rendah", "Sedang", "Tinggi", "Kritis"],
      default: "Sedang",
    },
    formBuilder: {
      type: [FormFieldSchema],
      default: [],
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

// ============================================================================
// MODEL EXPORT
// ============================================================================

const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", ServiceSchema);

export default Service;
