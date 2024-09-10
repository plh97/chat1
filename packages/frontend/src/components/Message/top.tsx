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
        <div className="text-center mt-2 mb-2 right-0 top-0 absolute w-full">
          <Spinner
            thickness="4px"
            speed="0.65s"
            emptyColor="gray.200"
            color="blue.500"
            size="md"
          />
        </div>
      )}
    </>
  );
};