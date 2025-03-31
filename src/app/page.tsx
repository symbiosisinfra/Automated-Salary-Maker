// app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to the dashboard or login page
  redirect("/login");
}
