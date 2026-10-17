import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "sonner";
import { AuthProvider } from "./lib/auth";

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#fff',
            border: '1px solid #e07b3c',
            color: '#111',
          },
        }}
      />
    </AuthProvider>
  );
}
