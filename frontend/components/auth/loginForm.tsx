"use client";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoginSchema } from "@/lib/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { z } from "zod";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { User } from '@/lib/types'
import { createSession } from "@/lib/session"
import {Endpoint, DecisionTree} from "@/lib/endpoint"

export default function LoginForm() {
  const router = useRouter()
  const form = useForm({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (req: z.infer<typeof LoginSchema>) => {
    const tree: DecisionTree = {
      200 : async (res: Response)=> {
        const user: User = await res.json()
        createSession(user.id)
        router.push('/dashboard')
      },
      401 : ()=> {
        form.setError("email", {
          type: "manual",
          message: "Invalid email or password",
        });
        form.setError("password", {
          type: "manual",
          message: "Invalid email or password",
        });
      },
      500 : ()=> {throw new Error("500")},
      502 : ()=> {throw new Error("502")}, 
    }
  const getLogin = new Endpoint("GET", "login", req, tree)
  await getLogin.Exec()
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
          </div>
          <Button type="submit" className="w-full" disabled={pending} >
            Login
          </Button>
        </form>
      </Form>
  );
};