import type { Metadata } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ClinicBook: scheduling for clinics and studios", template: "%s · ClinicBook" },
  description:
    "Online booking, a live week calendar and a waitlist that fills cancellations, built for clinics, gyms and tutors.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
