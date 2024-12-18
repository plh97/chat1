import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/next"

import { store } from "./store";
import theme from "./theme";

export function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <HomePage />,
    },
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/register",
      element: <RegisterPage />,
    },
    {
      path: "/room/:id",
      element: <RoomPage />,
    },
  ]);
  return (
    <Provider store={store}>
      <SpeedInsights />
      <ChakraProvider theme={theme}>
        <RouterProvider router={router} />
      </ChakraProvider>
    </Provider>
  );
}
