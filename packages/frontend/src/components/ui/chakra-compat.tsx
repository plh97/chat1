import * as React from "react";
import {
  Button as ChakraButton,
  ChakraProvider,
  Dialog,
  Field,
  Image as ChakraImage,
  IconButton as ChakraIconButton,
  Popover as ChakraPopover,
  Portal,
  Textarea as ChakraTextarea,
} from "@chakra-ui/react";
import theme from "@/theme";

export * from "@chakra-ui/react";
export { createStandaloneToast, useToast } from "@/utils/createStandAlone";

type LegacyButtonProps = React.ComponentProps<typeof ChakraButton> & {
  colorScheme?: string;
  icon?: React.ReactNode;
  isDisabled?: boolean;
  isLoading?: boolean;
  isRound?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, LegacyButtonProps>(
  (
    {
      children,
      colorPalette,
      colorScheme,
      icon,
      isDisabled,
      isLoading,
      isRound,
      ...props
    },
    ref
  ) => (
    <ChakraButton
      ref={ref}
      colorPalette={colorScheme ?? colorPalette ?? "gray"}
      disabled={isDisabled}
      loading={isLoading}
      rounded={isRound ? "full" : undefined}
      size={props.size ?? "md"}
      variant={props.variant ?? "solid"}
      {...props}
    >
      {icon}
      {children}
    </ChakraButton>
  )
);
Button.displayName = "Button";

type LegacyIconButtonProps = React.ComponentProps<typeof ChakraIconButton> & {
  colorScheme?: string;
  icon?: React.ReactNode;
  isDisabled?: boolean;
  isLoading?: boolean;
  isRound?: boolean;
};

export const IconButton = React.forwardRef<
  HTMLButtonElement,
  LegacyIconButtonProps
>(
  (
    {
      children,
      colorPalette,
      colorScheme,
      icon,
      isDisabled,
      isLoading,
      isRound,
      ...props
    },
    ref
  ) => (
    <ChakraIconButton
      ref={ref}
      colorPalette={colorScheme ?? colorPalette ?? "gray"}
      disabled={isDisabled}
      loading={isLoading}
      rounded={isRound ? "full" : undefined}
      size={props.size ?? "md"}
      variant={props.variant ?? "solid"}
      {...props}
    >
      {icon}
      {children}
    </ChakraIconButton>
  )
);
IconButton.displayName = "IconButton";

type LegacyTextareaProps = React.ComponentProps<typeof ChakraTextarea> & {
  focusBorderColor?: string;
};

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  LegacyTextareaProps
>(({ focusBorderColor, ...props }, ref) => (
  <ChakraTextarea
    ref={ref}
    _focusVisible={
      focusBorderColor ? { borderColor: focusBorderColor } : undefined
    }
    {...props}
  />
));
Textarea.displayName = "Textarea";

type LegacyImageProps = React.ComponentProps<typeof ChakraImage> & {
  fallbackSrc?: string;
};

export const Image = React.forwardRef<HTMLImageElement, LegacyImageProps>(
  ({ fallbackSrc, onError, ...props }, ref) => (
    <ChakraImage
      ref={ref}
      onError={(event) => {
        if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
          event.currentTarget.src = fallbackSrc;
        }
        onError?.(event);
      }}
      {...props}
    />
  )
);
Image.displayName = "Image";

export function FormControl({
  isRequired,
  ...props
}: React.ComponentProps<typeof Field.Root> & { isRequired?: boolean }) {
  return <Field.Root required={isRequired} {...props} />;
}

export const FormLabel = Field.Label;

type LegacyModalProps = React.PropsWithChildren<{
  isOpen: boolean;
  onClose: () => void;
  size?: React.ComponentProps<typeof Dialog.Root>["size"];
  isCentered?: boolean;
}>;

export function Modal({ children, isOpen, onClose, size }: LegacyModalProps) {
  return (
    <Dialog.Root
      open={isOpen}
      size={size}
      onOpenChange={({ open }) => {
        if (!open) onClose();
      }}
    >
      {children}
    </Dialog.Root>
  );
}

export function ModalOverlay(
  props: React.ComponentProps<typeof Dialog.Backdrop>
) {
  return (
    <Portal>
      <Dialog.Backdrop {...props} />
    </Portal>
  );
}

export function ModalContent(
  props: React.ComponentProps<typeof Dialog.Content>
) {
  return (
    <Portal>
      <Dialog.Positioner>
        <Dialog.Content {...props} />
      </Dialog.Positioner>
    </Portal>
  );
}
export const ModalHeader = Dialog.Header;
export const ModalBody = Dialog.Body;
export const ModalFooter = Dialog.Footer;

export function ModalCloseButton() {
  return <Dialog.CloseTrigger />;
}

export function useDisclosure(initialState = false) {
  const [open, setOpen] = React.useState(initialState);
  return {
    open,
    isOpen: open,
    onOpen: () => setOpen(true),
    onClose: () => setOpen(false),
    onToggle: () => setOpen((value) => !value),
    setOpen,
  };
}

const LegacyPopoverContext = React.createContext<{
  open?: boolean;
  onClose?: () => void;
}>({});

export function Popover({
  children,
  isOpen,
  onClose,
}: React.PropsWithChildren<{
  closeOnEsc?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}>) {
  return (
    <LegacyPopoverContext.Provider value={{ open: isOpen, onClose }}>
      <ChakraPopover.Root
        open={isOpen}
        onOpenChange={({ open }) => {
          if (!open) onClose?.();
        }}
      >
        {children}
      </ChakraPopover.Root>
    </LegacyPopoverContext.Provider>
  );
}

export function PopoverTrigger({ children }: React.PropsWithChildren) {
  return <ChakraPopover.Trigger asChild>{children}</ChakraPopover.Trigger>;
}

export function PopoverContent(
  props: React.ComponentProps<typeof ChakraPopover.Content>
) {
  return (
    <ChakraPopover.Positioner>
      <ChakraPopover.Content {...props} />
    </ChakraPopover.Positioner>
  );
}

export const PopoverArrow = ChakraPopover.Arrow;
export const PopoverCloseButton = ChakraPopover.CloseTrigger;
export const PopoverHeader = ChakraPopover.Title;
export const PopoverBody = ChakraPopover.Body;
export const PopoverFooter = ChakraPopover.Footer;

export function LegacyChakraProvider({ children }: React.PropsWithChildren) {
  return <ChakraProvider value={theme}>{children}</ChakraProvider>;
}
