import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pingDevice, type LiveVisitor } from "@/components/astra/SiteControl";

export type StaffCommandKind = "message" | "pause" | "resume" | "kick" | "ban" | "view" | "unview" | "redirect" | "reload" | "announce" | "unannounce" | "troll" | "untroll";
export type StaffTarget = { userId: string | null; deviceId?: string | null } | null;

const DONE: Partial<Record<StaffCommandKind, string>> = {
  message: "Message sent", kick: "Kicked", pause: "Screen paused", resume: "Screen resumed",
  redirect: "Sent to page", reload: "Reloaded", announce: "Announcement shown", unannounce: "Announcement cleared",
};

export async function sendStaffCommand(kind: StaffCommandKind, to: StaffTarget, message?: string, quiet = false) {
  const userId = to?.userId ?? null;
  const device = !userId && to?.deviceId ? to.deviceId : null;
  const { error } = await supabase.from("site_commands").insert({ kind, target: userId, target_device: device, message: message ?? null });
  if (error) {
    toast.error(error.message.includes("owner")
      ? error.message.includes("admin") ? "Only the owner can do that to an admin." : "The owner can't be kicked, paused or banned."
      : "You don't have permission for that.");
    return false;
  }
  if (!userId) void pingDevice(device ?? "*");
  if (!quiet && DONE[kind]) toast.success(DONE[kind]!);
  return true;
}

export const visitorTarget = (visitor: LiveVisitor): StaffTarget => ({ userId: visitor.userId, deviceId: visitor.deviceId });
