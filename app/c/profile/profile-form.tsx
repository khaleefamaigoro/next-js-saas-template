"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Schema = z.object({
  displayName: z.string().min(1).max(200),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  otherName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  companyName: z.string().max(200).optional(),
  address: z.string().max(400).optional(),
  contactPerson: z.string().max(200).optional(),
});

type Values = z.infer<typeof Schema>;

export function ClientProfileForm({ initial }: { initial: Values }) {
  const { register, handleSubmit, formState } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: initial,
  });
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    setInfo(null);
    const res = await apiPatch("/api/client/profile", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setInfo("Profile saved.");
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <FormField label="Display name" htmlFor="displayName" error={formState.errors.displayName?.message}>
            <Input id="displayName" {...register("displayName")} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First name" htmlFor="firstName" error={formState.errors.firstName?.message}>
              <Input id="firstName" {...register("firstName")} />
            </FormField>
            <FormField label="Last name" htmlFor="lastName" error={formState.errors.lastName?.message}>
              <Input id="lastName" {...register("lastName")} />
            </FormField>
          </div>
          <FormField label="Company" htmlFor="companyName" error={formState.errors.companyName?.message}>
            <Input id="companyName" {...register("companyName")} />
          </FormField>
          <FormField label="Phone" htmlFor="phone" error={formState.errors.phone?.message}>
            <Input id="phone" type="tel" {...register("phone")} />
          </FormField>
          <FormField label="Address" htmlFor="address" error={formState.errors.address?.message}>
            <Input id="address" {...register("address")} />
          </FormField>
          <FormField label="Contact person" htmlFor="contactPerson" error={formState.errors.contactPerson?.message}>
            <Input id="contactPerson" {...register("contactPerson")} />
          </FormField>
          {info ? <p className="text-sm text-green-700">{info}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
