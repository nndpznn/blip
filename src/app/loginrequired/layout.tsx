import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "blip - please login",
	description: "looks like you are not logged in. please login to continue.",
  };

export default function LoginRequiredPageLayout({
	children,
  }: {
	children: React.ReactNode
  }) {
	return (
	  <section>
		<main>{children}</main>
		
	  </section>
	)
  }