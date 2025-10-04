import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "SANDBOX",
	description: "you are not supposed to be seeing this.",
  };

export default function SandboxPageLayout({
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