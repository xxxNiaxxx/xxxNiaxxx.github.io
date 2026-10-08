"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client/api";
import { useMutation } from "@/lib/client/use-mutation";

export function AcceptInvitation({ token, organizationName }: { token: string; organizationName: string }) {
  const router = useRouter();
  const { run, pending } = useMutation();
  return (
    <Button
      size="lg"
      className="mt-6 w-full"
      loading={pending}
      onClick={() =>
        run(() => api("/api/invitations/accept", { body: { token } }), {
          success: `Καλώς ήρθατε στην ομάδα ${organizationName}`,
          refresh: false,
          onSuccess: () => {
            router.push("/dashboard");
            router.refresh();
          },
        })
      }
    >
      Αποδοχή πρόσκλησης
    </Button>
  );
}
