"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RegisterSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { z } from "zod";
import { useFormStatus } from "react-dom";
import { useRouter } from 'next/navigation';
import {Endpoint, DecisionTree} from "@/lib/endpoint";
import { createSession } from "@/lib/session";
import { User } from "@/lib/types";

export default function RegisterForm() {
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (unsanitizedReq: z.infer<typeof RegisterSchema>) => {
    const req = RegisterSchema.parse(unsanitizedReq)
    const tree: DecisionTree = {
      200 : async (res: Response)=> {
        const user: User = await res.json()
        createSession(user.id)
        router.push('/dashboard')
      },
      409 : ()=> { 
        form.setError("email", {
          type: "manual",
          message: "Email or username already in use",
        });
        form.setError("username", {
          type: "manual",
          message: "Email or username already in use",
        });
      }
    }

    const postRegister = new Endpoint("POST", "register", req, tree)
    await postRegister.Exec()
  };

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
              <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} type="username" placeholder="janedoe" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Loading..." : "Register"}
          </Button>
          </div>
        </form>
      </Form>
  );
};
