import { redirect } from "next/navigation";

import { getControlAdmin } from "@/lib/control-auth";

import ControlPanel from "./panel";

export default async function ControlPage() {
  const admin = await getControlAdmin();

  if (!admin) {
    redirect("/control/login");
  }

  return (
    <ControlPanel
      admin={{
        name: admin.name,
        email: admin.email,
      }}
    />
  );
}