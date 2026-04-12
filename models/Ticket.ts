import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================================================
// INTERFACES
// ============================================================================

export interface IStatusHistory {
  status: string;
  actor: string;
  note?: string;
  timestamp: Date;
}

export interface ITicket extends Document {
  ticketId: string;             // Custom Enterprise ID: TKT-YYMMDD-XXXX
  mahasiswaId: string;          // Diambil otomatis dari session, BUKAN dari form input
  departmentId: string;
  serviceId: mongoose.Types.ObjectId; // Relasi ke Service
  status: string;               // Status saat ini (single field untuk efisiensi query)
  prioritas: string;            // Tingkat urgensi tiket (Rendah, Sedang, Tinggi, Kritis)
  
  // Public/Guest System Fields
  isGuest: boolean;
  guestName?: string;
  guestContact?: string;
  guestPin?: string;

  dynamicData: Map<string, unknown>; // Semua jawaban form (termasuk URL file)
  formSnapshot: unknown[];      // Snapshot layout form saat tiket dibuat (Point-in-Time)
  statusHistory: IStatusHistory[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SUB-SCHEMA: Status History
// ============================================================================

const StatusHistorySchema = new Schema<IStatusHistory>(
  {
    status: { type: String },
    actor: { type: String },
    note: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ============================================================================
// SCHEMA UTAMA: Ticket (Fully Dynamic / Schema-less)
// ============================================================================

const TicketSchema = new Schema<ITicket>(
  {
    ticketId: {
      type: String,
      unique: true,
      required: [true, "Ticket ID wajib ada"],
      index: true,
    },
    mahasiswaId: {
      type: String,
      required: [true, "Mahasiswa ID wajib diisi"],
      index: true, // untuk query "tiket saya" yang efisien
    },
    departmentId: {
      type: String,
      required: [true, "Department ID wajib diisi"],
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: [true, "Service ID wajib diisi"],
    },
    status: {
      type: String,
      default: "Masuk",
    },
    prioritas: {
      type: String,
      enum: ["Rendah", "Sedang", "Tinggi", "Kritis"],
      default: "Sedang",
      required: [true, "Prioritas wajib diisi"],
    },
    isGuest: { type: Boolean, default: false },
    guestName: { type: String },
    guestContact: { type: String },
    guestPin: { type: String },
    // Map untuk menyimpan semua jawaban form secara dinamis
    // Key = field.id dari formBuilder, Value = string/number/URL file
    dynamicData: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {},
    },
    // Snapshot layout form saat tiket dibuat (Point-in-Time, immutable)
    formSnapshot: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true, // otomatis tambah createdAt & updatedAt
  }
);

// ============================================================================
// INDEXES — Optimasi performa query
// ============================================================================

// Lookup tiket by custom ID (halaman tracking)
TicketSchema.index({ ticketId: 1 });

// Sorting dashboard mahasiswa & admin (terbaru di atas)
TicketSchema.index({ createdAt: -1 });

// Filter utama Admin Departemen: lihat tiket dept-nya yang berstatus tertentu
TicketSchema.index({ departmentId: 1, status: 1 });

// Filter pencarian dan penyaringan prioritas cepat
TicketSchema.index({ prioritas: 1 });

// ============================================================================
// MODEL EXPORT
// ============================================================================

const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema);

export default Ticket;
