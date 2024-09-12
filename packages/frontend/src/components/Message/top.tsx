import { Loader2 } from "lucide-react";

export const Top = ({
  hasMessage,
  loadingMessage,
}: {
  hasMessage: boolean;
  loadingMessage: boolean;
}) => {
  return (
    <>
      {!hasMessage && !loadingMessage && (
        <div className="text-center m-4">---------- END ----------</div>
      )}
      {loadingMessage && (
        <div className="mt-2 mb-2 right-0 top-0 absolute w-full flex justify-center">
          <Loader2 className="text-2xl w-8 h-8 text-gray-200 animate-spin dark:text-gray-600" />
          {/* <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.200"
            color="blue.500"
            size="md"
          /> */}
        </div>
      )}
    </>
  );
};