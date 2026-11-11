"use client";
import { useTransition } from "react";
import { deleteCycle } from "@/app/actions/cycles";
import { Button } from "@/components/tandem/ui";

export function DeleteCycleButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      style={{ color: "var(--alert)" }}
      onClick={() => confirm(`Delete "${name}" and all its sessions, including logs?`) && start(() => deleteCycle(id))}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
