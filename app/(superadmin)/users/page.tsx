export const dynamic = 'force-dynamic';

import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  await dbConnect();
  
  // Fetch users dari MongoDB
  const users = await User.find({}).sort({ createdAt: -1 }).lean();
  
  // Serialize ObjectId ke string
  const serializedUsers = users.map((u: any) => ({
    _id: u._id.toString(),
    nim_nip: u.nim_nip,
    nama: u.nama,
    role: u.role,
  }));

  return <UsersClient initialUsers={serializedUsers} />;
}
