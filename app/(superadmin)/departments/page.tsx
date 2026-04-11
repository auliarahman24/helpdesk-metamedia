export const dynamic = 'force-dynamic';
import { getDepartments } from "@/app/actions/departmentActions";
import DepartmentsClient from "./DepartmentsClient";

export default async function DepartmentsPage() {
  const departments = await getDepartments();
  return <DepartmentsClient initialDepartments={departments} />;
}
