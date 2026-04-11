export const dynamic = 'force-dynamic';
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAllServices } from "@/app/actions/serviceActions";
import { getDepartments, type DepartmentRow } from "@/app/actions/departmentActions";
import ServiceManager from "./ServiceManager";

async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("user_session");
  if (!sessionCookie) return null;
  try {
    return JSON.parse(sessionCookie.value) as {
      nim_nip: string;
      role: string;
      nama: string;
    };
  } catch {
    return null;
  }
}

export default async function ServicesPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  // Fetch semua layanan DAN departemen dari database secara paralel
  const [services, departments] = await Promise.all([
    getAllServices(),
    getDepartments(),
  ]);

  return (
    <ServiceManager
      initialServices={services}
      initialDepartments={departments}
    />
  );
}
