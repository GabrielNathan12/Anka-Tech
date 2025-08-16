'use client';

import { useAuth } from '@/context/auth';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const {isAuthenticated, loading} = useAuth()
    const router = useRouter()

    useEffect(() => {
        if(!loading && !isAuthenticated) {
            router.replace('/')
        }
    }, [loading, isAuthenticated, router])

    if(loading) {
        return (
            <div className="min-h-[50vh] grid place-items-center">Carregando…</div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    return (
        <>
            {children}
        </>
    )

}