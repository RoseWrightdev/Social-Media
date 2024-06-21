"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { z } from "zod";
import { useFormStatus } from "react-dom";
import { Endpoint, DecisionTree } from "@/lib/endpoint"
import { useRouter } from "next/navigation";

export default function UpdatePasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (password: z.infer<typeof PasswordSchema>) => {
    const tree: DecisionTree = {
      200 : ()=> {router.push("/login")},
      400 : ()=> {throw new Error("400")}, 
      500 : ()=> {throw new Error("500")},
    }

    const req = {token, password: password.password};
    const postUpdatePassword = new Endpoint("POST", "updatepassword", req, tree)
    await postUpdatePassword.Exec()
  }

  const { pending } = useFormStatus();
  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="******" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" placeholder="******" />
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