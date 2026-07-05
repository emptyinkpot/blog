import "./globals.css";

export const metadata = {
  title: "MyBlog Admin",
  description: "MyBlog admin console prototype",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
