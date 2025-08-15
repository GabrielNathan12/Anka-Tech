import { api } from "@/lib/api";

interface AuthLogin  {
    email: string
    password: string   
}

interface AuthRegister  {
    email: string
    name: string
    password: string   
}


export const authLogin = async ({email, password}: AuthLogin) => {
    const res = await api.post(`${process.env.NODE_ENV}/auth/login`, {
        email : email, password : password
    })
    return res.data
}

export const authRegister = async({email, name, password}: AuthRegister ) => {
    const res = await api.post(`${process.env.NODE_ENV}/auth/register`, {
        name: name,
        email: email,
        password: password
    })

    return res.data
}