'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { login } from "@/schemas/auth";
import { useRouter } from 'next/navigation';
import * as z from "zod"; 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { authLogin } from "@/services/auth/auth";
import { FormControl, FormField, FormItem, FormMessage, Form } from "@/components/ui/form";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type FormValues = z.infer<typeof login>

export default function LoginForm() {
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(login),
        defaultValues: {
            email: '',
            password: ''
        },
        mode: 'onTouched'
    })

    const { mutate: loginAuth, isPending, isSuccess, error, data} = useMutation({
        mutationFn: authLogin,
        onSuccess: (res) => {
            router.push('/dashboard')
        },
        onError: (error) => {
            console.log(error)
        } 
    })

    const onSubmit = (data: FormValues) => {
        loginAuth(data)
    }

    return (
        <div className="w-full max-w-[720px] sm:max-w-[340px] p-[1px] rounded-xl bg-gradient-to-r from-[rgba(250,69,21,1)] via-[rgba(214,162,7,1)] to-[rgba(148,41,12,1)]">
            <Card className="w-full rounded-xl">
                <CardHeader className="flex flex-col items-center gap-2">
                    <Image src='/logo_anka.png' alt="Logo Anka Tech" width={90} height={90} priority/>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem>
                                    <Label htmlFor="email">E-mail</Label>
                                    <FormControl>
                                        <Input id="email" type="email" placeholder="exemplo@gmail.com" disabled={isPending} {...field} />
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <Label htmlFor="password">Senha</Label>
                                    <FormControl>
                                        <div className="relative">
                                            <Input id="password" type={ showPassword ? "text" : "password"} placeholder="******" disabled={isPending} {...field} className="pr-10"/>
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-300" tabIndex={-1}>
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4"/>
                                                ) : (
                                                    <Eye className="h-4 w-4"/>
                                                )}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage/>
                                </FormItem>
                            )}/>
                            {error instanceof Error && (
                                <p className="text-sm text-red-500">Erro: {error.message}</p>
                            )}
                            {isSuccess && (
                                <p className="text-sm text-emerald-500">Login realizado com sucesso!</p>
                            )}

                            <Button type="submit" className="w-full bg-color" disabled={isPending} variant={"outline"}>
                                {isPending ? 'Entrando...' : 'Entrar'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}