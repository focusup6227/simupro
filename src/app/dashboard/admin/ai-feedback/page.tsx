import { redirect } from "next/navigation";

/** Legacy URL — QA hub moved to `/dashboard/admin/qa`. */
export default function AdminAiFeedbackRedirectPage() {
  redirect("/dashboard/admin/qa");
}
