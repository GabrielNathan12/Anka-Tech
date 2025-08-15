'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react";

interface Props {
    children: ReactNode
}


export default function ReactQueryProvider({ children}: Props) {
    const [queryCliet] = useState(() => new QueryClient())


    return (
        <QueryClientProvider client={queryCliet}>
            {children}
        </QueryClientProvider>
    )
}