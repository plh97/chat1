import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { store } from "./store";
import theme from "./theme";
import { lazy, StrictMode, Suspense } from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { AppToaster } from "@/utils/createStandAlone";

const HomePage = lazy(() =>
  import("./views/HomePage").then((m) => ({ default: m.HomePage }))
);
const LoginPage = lazy(() =>
  import("./views/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("./views/RegisterPage").then((m) => ({ default: m.RegisterPage }))
);
const RoomPage = lazy(() =>
  import("./views/RoomPage").then((m) => ({ default: m.RoomPage }))
);

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
  // const browserRouter = withFaroRouterInstrumentation(reactBrowserRouter);
  return (
    <StrictMode>
      <Provider store={store}>
        <ChakraProvider value={theme}>
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center">
                Loading...
              </div>
            }
          >
            <RouterProvider router={router} />
          </Suspense>
          <AppToaster />
        </ChakraProvider>
      </Provider>
    </StrictMode>
  );
};
