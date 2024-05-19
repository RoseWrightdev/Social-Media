import * as z from 'zod';

//fix add complexity checks to password e.g. uppercase, lowercase, number, special character
export const RegisterSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address"
    }),

    username: z.string().min(3, {
        message: "Username must be at least 3 characters long"
    }),

    password: z.string().min(8, {
        message: "Password must be at least 8 characters long"
    }).max(255, {
        message: "Password must be less than 255 characters long"
    }),

    confirmPassword: z.string().min(8, {
        message: "Password must be at least 8 characters long"
    }).max(255, {
        message: "Password must be less than 255 characters long"
    })
    }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    });

export const LoginSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address"
    }),
    password: z.string().min(6, {
        message: "Password must be at least 8 characters long"
})
})

export const EmailSchema = z.object({
    email: z.string().email({
        message: "Please enter a valid email address"
    }),
})

//fix add complexity checks to password e.g. uppercase, lowercase, number, special character
export const PasswordSchema = z.object({
    password: z.string().min(8, {
        message: "Password must be at least 8 characters long"
    }).max(255, {
        message: "Password must be less than 255 characters long"
    }),

    confirmPassword: z.string().min(8, {
        message: "Password must be at least 8 characters long"
    }).max(255, {
        message: "Password must be less than 255 characters long"
    })
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});