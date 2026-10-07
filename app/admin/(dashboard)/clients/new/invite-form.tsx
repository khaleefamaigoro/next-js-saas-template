"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Schema = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(40).optional(),
  companyName: z.string().max(200).optional(),
});

type Values = z.infer<typeof Schema>;

export function InviteClientForm() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
  });
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost<{ client: { id: string } }>("/api/tenant/clients", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.push("/admin/clients");
  });

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Client details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Email" htmlFor="email" error={formState.errors.email?.message}>
            <Input id="email" type="email" {...register("email")} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First name" htmlFor="firstName" error={formState.errors.firstName?.message}>
              <Input id="firstName" {...register("firstName")} />
            </FormField>
            <FormField label="Last name" htmlFor="lastName" error={formState.errors.lastName?.message}>
              <Input id="lastName" {...register("lastName")} />
            </FormField>
          </div>
          <FormField label="Company (optional)" htmlFor="companyName" error={formState.errors.companyName?.message}>
            <Input id="companyName" {...register("companyName")} />
          </FormField>
          <FormField label="Phone (optional)" htmlFor="phone" error={formState.errors.phone?.message}>
            <Input id="phone" type="tel" {...register("phone")} />
          </FormField>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Sending invite…" : "Send invite"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
