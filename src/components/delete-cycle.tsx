"use client";
import { useTransition } from "react";
import { deleteCycle } from "@/app/actions/cycles";

export function DeleteCycleButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-xs text-bad"
      onClick={() => confirm(`Delete "${name}" and all its sessions (including logs)?`) && start(() => deleteCycle(id))}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
