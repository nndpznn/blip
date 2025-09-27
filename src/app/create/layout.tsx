import type { Metadata } from "next"

export const metadata: Metadata = {
	title: "blip - new meet",
	description: "create a meet!",
  };

export default function CreatePageLayout({
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