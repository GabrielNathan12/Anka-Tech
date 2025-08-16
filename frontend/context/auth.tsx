'use client';

import { api, setAuthToken } from '@/lib/api';
import { authLogin } from '@/services/auth/auth';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type AuthUser = {
    id: string
    name: string
    email: string
} | null

export interface AuthLoginInput {
  email: string;
  password: string;
}

type AuthContextType = {
    user: AuthUser
    token: string | null
    isAuthenticated: boolean
    loading: boolean
    successLogin: boolean
    signIn: (input: AuthLoginInput) => Promise<void>
    signOut: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [token, setToken] = useState<string | null>(null)
    const [user, setUser] = useState<AuthUser>(null)
    const [successLogin, setLoginSuccess] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if(stored) {
            setToken(stored)
            setAuthToken(stored)
            api.get('/auth/me').then(res => setUser(res.data)).catch(() => {})
        } 
        setLoading(false)
    }, [])

    useEffect(() => {
        const id = api.interceptors.response.use(
            (res) => res,
            (err) => {
                if(err?.response?.status === 401) {
                    signOut()
                }
                return Promise.reject(err)
            }
        )
        return () => api.interceptors.response.eject(id)
    }, [])

    async function signIn(input: AuthLoginInput) {
        const res = await authLogin(input)
        localStorage.setItem('auth_token', res.accessToken)
        setAuthToken(res.accessToken)
        setToken(res.accessToken)
        setLoginSuccess(true)
        if(res.user) {
            setUser(res.user)
        }
        router.push('/dashboard')
    }

    function signOut() {
        localStorage.removeItem('auth_token')
        setToken(null)
        setUser(null)
        setAuthToken(null)
        router.replace('/')
    }

    const value = useMemo(() => ({
        user, token, isAuthenticated: !!token, loading, signIn, signOut, successLogin
    }), [user, token, loading, successLogin])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return ctx
}