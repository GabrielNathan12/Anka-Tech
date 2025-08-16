'use client';

import { useAuth } from "@/context/auth";
import RequireAuth from "@/guard/RequireAuth";

export default function Dashboard() {
	const {user} = useAuth()

	console.log(user)
  	return (
		<RequireAuth>
			<div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
				<main className="flex-min-h-screen items-center justify-center">
					<h1 className="text-4xl font-bold">Dashboard</h1>
				</main>
			</div>
		</RequireAuth>
  	);
}
