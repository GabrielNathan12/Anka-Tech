import axios from "axios";

export const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ||  'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    }
})

export function setAuthToken(token: string | null) {
    if(token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}` 
    }
    else {
        delete api.defaults.headers.common.Authorization
    }
}