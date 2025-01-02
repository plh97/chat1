import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { store } from "./store";
// import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import theme from "./theme";

export const App = (): React.ReactNode => {
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
      {/* <Theme className="h-full" accentColor="indigo"> */}
        <ChakraProvider theme={theme}>
          <RouterProvider router={router} />
        </ChakraProvider>
      {/* </Theme> */}
    </Provider>
  );
};
