"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { EmailSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { z } from "zod";
import { useFormStatus } from "react-dom";
import { Endpoint, DecisionTree } from "@/lib/endpoint"
import { useRouter } from "next/navigation";

export default function ResetPasswordForm() {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(EmailSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (unsanitizedEmail: z.infer<typeof EmailSchema>) => {
    const email = EmailSchema.parse(unsanitizedEmail)
    const tree: DecisionTree = {
      200 : ()=> router.push("/login"), 
    }

    const postResetPassword = new Endpoint("POST", "resetpassword", email, tree)
    await postResetPassword.Exec()
  }

  const { pending } = useFormStatus();
  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="johndoe@gmail.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending} >
            Reset Password
          </Button>
        </form>
      </Form>
  );
};