export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Department from "@/models/Department";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  await dbConnect();
  
  // Fetch users dari MongoDB
  const users = await User.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
  
  // Serialize ObjectId ke string
  const serializedUsers = users.map((u: any) => ({
    _id: u._id.toString(),
    nim_nip: u.nim_nip,
    nama: u.nama,
    role: u.role,
    departmentId: u.departmentId,
  }));

  // Fetch active departments for the dropdown
  const departments = await Department.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
  const serializedDepartments = departments.map((d: any) => ({
    _id: d._id.toString(),
    departmentId: d.departmentId,
    namaDepartemen: d.namaDepartemen,
  }));

  return <UsersClient initialUsers={serializedUsers} initialDepartments={serializedDepartments} />;
}
