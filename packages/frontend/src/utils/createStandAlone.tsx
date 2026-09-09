import { Portal, Stack, Toast, Toaster, createToaster } from "@chakra-ui/react";

export type ToastStatus = "info" | "warning" | "success" | "error";

export interface UseToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  duration?: number | null;
  status?: ToastStatus;
  position?: string;
  isClosable?: boolean;
  id?: string | number;
}

export type IToast = UseToastOptions;

export const appToaster = createToaster({
  placement: "top",
  pauseOnPageIdle: true,
});

type ToastFunction = ((options?: UseToastOptions) => string) & {
  closeAll: () => void;
};

const notify: ToastFunction = Object.assign(
  (options: UseToastOptions = {}) =>
    appToaster.create({
      title: options.title,
      description: options.description,
      duration: options.duration ?? undefined,
      type: options.status,
    }),
  { closeAll: () => appToaster.dismiss() }
);

export function createStandaloneToast() {
  return { toast: notify };
}

export function useToast() {
  return notify;
}

export function AppToaster() {
  return (
    <Portal>
      <Toaster toaster={appToaster} insetInline={{ mdDown: "4" }}>
        {(toast) => (
          <Toast.Root width={{ md: "sm" }}>
            <Toast.Indicator />
            <Stack gap="1" flex="1" maxWidth="100%">
              {toast.title && <Toast.Title>{toast.title}</Toast.Title>}
              {toast.description && (
                <Toast.Description>{toast.description}</Toast.Description>
              )}
            </Stack>
            <Toast.CloseTrigger />
          </Toast.Root>
        )}
      </Toaster>
    </Portal>
  );
}

export default useToast;
